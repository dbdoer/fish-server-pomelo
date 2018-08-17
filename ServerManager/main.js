/**
 * Created by ck01-441 on 2016/3/3.
 * 管理当前物理机上的server
 * 根据配置文件启动Server
 * 从web端接收指令 动态启动/停止server
 * 查询当前启动的server
 */

function nop() {
}


// 启动/关闭GameServer子进程
var cp = require('child_process');
var express = require('express');
var os = require('os');
var exec = require('child_process').exec;
var fs = require("fs");
var serverConfig = require("../conf/config.json");
var conf_sm = require("../conf/config.json").ServerManager;
var logger = require("../common/logHelper").helper;
var app = express();
app.use(express.static(__dirname + '/public'));
var LOCAL_HOST_INTENT;


var cpList = {};
var alive = false;

//获取内网ip
function getLocalIP() {
    var map = [];
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
        if (dev.indexOf('本地连接') != -1) {
            return ifaces[dev][1].address;
        }
    }
    return map;
}

app.get('/echo', function (req, res) {
    res.send('echo');
});
app.get('/', function (req, res) {
    res.send('404');
});

app.get('/getServerStartConfig', function (req, res) {
    var result = serverConfig.staticStart;
    res.end(JSON.stringify(result));
})

app.get("/getGameServerInfo", function (req, res) {
    var name = os.platform();
    var cmd = "";
    if (name == "win32") {
        cmd = 'netstat -aon | findstr ';
    } else {
        cmd = "netstat -aon | grep ";
    }
    var port = req.query.port;
    var cmd = cmd + port;
    var child = exec('netstat -aon',
        function (error, stdout, stderr) {
            if (stdout.indexOf(":" + port) > 0) {
                res.end(port + " is listening!!!")
            } else {
                res.end(port + " is shutdown!!!")
            }

            if (error !== null) {
                console.log('exec error: ' + error);
                res.end(error);
            }
        });
});

app.get('/killchild', function (req, res) {
    if (cpList[req.query.port]) {
        res.end(cpList[req.query.port].cp.pid + "");
        cpList[req.query.port].cp.send("kill");
    }
});

app.get('/killall', function (req, res) {
    if (!alive) {
        res.end("error:server not start")
        return;
    }
    for (var i in cpList) {
        cpList[i].cp.send("kill");
    }
    cpList = {}; //清空
    alive = false;
    res.end("success:all servers stopped")
})

app.get('/startAllServer', function (req, res) {
    var ip = req.query.ip;  //远端传进来
    if (alive) {
        res.end("error:server already started");
        return;
    }
    var servers = serverConfig.staticStart;
    for (var i = 0; i < servers.length; i++) {
        startServer(servers[i].type, ip, servers[i].socketPort, servers[i].rpcPort, servers[i].httpPort);
    }
    alive = true;
    res.end("success:server start");
});

app.get('/restartserver', function (req, res) {
    var port = req.query.port;
    restartServer(port, function (err) {
        if (!err) {
            res.end("restart child process success");
        } else {
            res.end(err);
        }
    });
});

/**
 * 根据传入参数启动不同类型的server
 * @param type 启动的server类型
 * @param host 本机地址
 * @param socketPort 对客户端的端口
 * @param rpcPort rpc远程调用端口
 * @param httpPort 如果有 http监听端口
 * @return 返回ChildProcess实例
 * */
function startServer(type, host, socketPort, rpcPort, httpPort) {
    var path = "./" + type + "/main.js";
    var c = cp.fork(path, [JSON.stringify({
        local: host,
        rpc: rpcPort,
        http: httpPort,
        socket: socketPort,
        master: conf_sm.master
    })]);
    c.on("exit", function () {
        //进程退出 重启
        //restartServer(index, nop);
    });
    var index = socketPort === 0 ? (httpPort === 0 ? rpcPort : httpPort ) : socketPort;
    if(cpList[index]) {
	    logger.err("type:[%s] port is same to type:[%s]", cpList[index].type, type);
    }
    cpList[index] = {
        "socketPort": socketPort,
        "httpPort": httpPort,
        "rpcPort": rpcPort,
        "type": type,
        "cp": c
    };
    cpList[index].fsWatcher = fs.watch(path, function (event, fileName) {
        //event是所发生事件的名字
        switch (event) {
            case "rename":
                break;
            case "change":
                //文件改变 重启这个文件所在的server
                restartServer(index, nop);
                break;
            default:
        }
    });
    c.on("exit", function () {
        delete cpList[index];
    });
}

function restartServer(index, cb) {
    if (!cpList[index]) {
        return cb("no such child process");
    }
    var cpObj = cpList[index];
    cpObj.cp.send("kill");
    setTimeout(function () {
        startServer(cpObj.type, LOCAL_HOST_INTENT, cpObj.socketPort, cpObj.rpcPort, cpObj.httpPort);
        console.log("==restartServer==>process:" + index + " resart");
        cb(null);
    }, 2000);
}

function startConfig(res) {
    if (alive) {
        res.end("error:server already started");
        return;
    }
    var servers = serverConfig.staticStart;
    for (var i = 0; i < servers.length; i++) {
        startServer(servers[i].type, conf_sm.ip, servers[i].socketPort, servers[i].rpcPort, servers[i].httpPort);
    }
    alive = true;
}
startConfig();

//app.listen(5002);

process.on('SIGINT', function () {
	logger.info('关闭子进程');
    for (var i in cpList) {
        cpList[i].cp.send("kill");
    }
    cpList = {}; //清空
    alive = false;
    process.exit(0);
});

process.on('exit', function () {
	logger.info('关闭子进程');
    for (var i in cpList) {
        cpList[i].cp.send("kill");
    }
    cpList = {}; //清空
});


process.on('uncaughtException', function (err) {
    //打印出错误的调用栈方便调试
    logger.err(err.stack || err.message);
});
