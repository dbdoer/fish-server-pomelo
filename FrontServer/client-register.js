"use strict";
var logger = require("../common/logHelper").helper;
var http = require('http');
var net = require("net");
var readline = require('readline');
var dataParser = require("./MsgParser.js");
var config = require('../conf/config');
var COMMON = require('../common/commons');
var sock = null;
var userid= null;


//机器人开火数量
var fire_max_cont = 100;
//每秒开火次数
var fire_num_second = 10;


var frontserver_url_config = {
    ip:"127.0.0.1",
    port:"40001"
}

var gateserver_url_config = {
    ip:"127.0.0.1",
    port:"40003"
}

var recv_total = 0;
var LENGTH_BYTE = 2;
var PACKAGE_ID_BYTE = 4;
//var initFrontServer = function(){
    // sock is an instance of net.Socket
    sock = net.connect(frontserver_url_config.port,frontserver_url_config.ip, function(){
        console.log('server connected');
        logger.info('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
    });


    sock.on("data", function (data) {
        //console.log('got data - '+ recv_total ++);
    //收到data后进行解包
    if (!Buffer.isBuffer(data)) {return;}

    while (true) {
        //循环处理剩余消息(每次都处理干净）
        if (data == null || data.length < 2) {
            //连长度都没有 直接返回
            return;
        }
        var packageLength = data.readUInt16BE(0); //获取了包长度
        if (data.length < packageLength + LENGTH_BYTE) {
            //半包
            return;
        }
        var packageID = data.readUInt32BE(LENGTH_BYTE); // 获取了包ID

        var packageData = data.slice(LENGTH_BYTE + PACKAGE_ID_BYTE, LENGTH_BYTE + parseInt(packageLength)); //切掉长度+ID的头
        if (data.length > packageLength + LENGTH_BYTE) {
            //粘包循环处理 直到半包或者处理完毕
            data = data.slice(LENGTH_BYTE + parseInt(packageLength));
        } else {
            data = null;
        }
        var parsedData = dataParser.paparseResponserse(packageID, packageData);

        try
        {
            console.log('got data - %d, %s', recv_total ++, packageID);
            var handler = handlerProcess[packageID];
            if(handler){
                handler(parsedData);
            }else{
                logger.info("msg " + packageID + " = " + JSON.stringify(parsedData ));
            }
        }
        catch(e)
        {
            logger.err('front server msg:' + e.stack || e.message);
        };

    }
});

    sock.on('end', function(){
        logger.info('client disconnected ');
    });

    sock.on('error', function(err){
        logger.info('socket error - ', err);
    });

    sock.on('close', function(){
        logger.info('echo client was closed');
        process.exit(0);
    });
//}

//定时开火句柄
var fire_interval_handler = null;
var handlerProcess = {
    //收到登录消息
    4101:function(data){
        logger.info(JSON.stringify(data));
        //console.log( "login uid = ",  data.userInfo.uid);
        userid = data.userInfo.uid;
        console.log( "enter room uid = ",  userid);
        msgToFrontEnterRoom(userid);
    }

    //收到进入房间消息
    ,4201:function(data){
        logger.info(" return enter room -" + JSON.stringify(data));

        fire_interval_handler = setInterval(function(){
            msgToFrontRoomFire(userid);
            if(-- fire_max_cont < 0){
                //终止开火
                clearInterval(fire_interval_handler);

                //离开房间
                msgToFrontLeaveRoom(userid);
            }
        }, 1000/fire_num_second);

    }

    //收到广播进入房间消息
    ,4203:function(data){
        console.log( "SC_BroadcastEnterRoom  room uid = ",  userid);
    }

    //离开房间
    ,4205:function(data){
        console.log( "SC Leave Room uid = ",  userid);

        fire_max_cont = COMMON.INRANGE_RANDOM(0, 10);
        msgToFrontEnterRoom(userid);
    }


    //开火回馈消息
    ,4207:function(data){
        console.log( "fire ret - ",  JSON.stringify(data));
    }
}

//发送登录消息
var msgToFrontLogin = function(robot_uid){
    var buf = dataParser.buildProtoMsgRquest(101, null, {uid: robot_uid, uuid:'struuid'});
    sock.write(buf);
}

//发送进入房间
var msgToFrontEnterRoom = function(robot_uid){

    console.log("enter room = ", robot_uid);
    var buf = dataParser.buildProtoMsgRquest(201, null,
        { userInfo:{uid: robot_uid
            , gold: 9999999
            , gem: 999999
            , unlockedSkins:9}
            ,roomId:'1112001'  //capture.json
            ,matchTypeId:'1112001'  //capture.json
            ,tracktime:[{trackId : 100 ,time : 200}
                        ,{trackId : 101 ,time : 200}
                        ,{trackId : 102 ,time : 200}
                        ,{trackId : 103 ,time : 200}
                        ,{trackId : 104 ,time : 200}
                        ]
        });

    sock.write(buf);
}

//发送退出房间
var msgToFrontLeaveRoom = function(robot_uid){
    var buf = dataParser.buildProtoMsgRquest(205, null, {type: 1});
    sock.write(buf);
}

//发送普通房间开火
var msgToFrontRoomFire = function(robot_uid){
    var param = [COMMON.INRANGE_RANDOM(0,4),COMMON.INRANGE_RANDOM(0,800),COMMON.INRANGE_RANDOM(0,600)];
    var buf = dataParser.buildProtoMsgRquest(207, null, param);
    sock.write(buf);
    console.log("fire - %s , %s ", robot_uid, JSON.stringify(param));

}


//发送用户注册
var msgToGateRegisterUser = function(){
    // 用于请求的选项
    var options = {
        host: gateserver_url_config.ip,
        port: gateserver_url_config.port,
        path: '/fish4/userRegister?ver=' + config.Version +
        '&account="test"' +
        '&password="test" '
    };

    // 处理响应的回调函数
    var callback = function(response){
        // 不断更新数据
        var body = '';
        response.on('data', function(data) {
            body += data;
            console.log(body);
        });

        response.on('end', function() {
            // 数据接收完成
            console.log(body);
        });
    };
    // 向服务端发送请求
    var req = http.request(options, callback);
    req.end();
};

    var count = 1000;
//发送游客注册
var msgToGateRegisterGuest = function(acc, pwd){
    // 用于请求的选项
    var options = {
        host: gateserver_url_config.ip,
        port: gateserver_url_config.port,
        path: '/fish4/guestRegister?ver=' +config.Version
        +'&macStr=' + acc
        +'&nickname=' + acc
        +'&channel=' + "ROBOT"
        +'&headImage=' + 1
    };

    // 处理响应的回调函数
    var callback = function(response){
        // 不断更新数据
        var body = '';
        response.on('data', function(data) {
            body += data;
            console.log('data', body);

            if(--count> 0){
                msgToGateRegisterGuest('rt'+ count, '');
            }

        });

        response.on('end', function() {
            // 数据接收完成
            console.log('end', body);
        });
    };
    // 向服务端发送请求
    var req = http.request(options, callback);
    console.log("http = %s", JSON.stringify(options));
    req.end();
};


//批量注册游客
var batch_test_register_guest = function(num){
    for(var k =0; k< num; k++){
        console.log("regiter guester - "+k);
        msgToGateRegisterGuest('r-'+k,'');
    }
}

//批量注册用户
var batch_test_register_user = function(num){
    for(var k in batch_test_robot_list ){
        msgToGateRegisterUser(batch_test_robot_list[k],'');
    }
};

//多线程启动入口
var clone_start = function() {
    var param = null;
    if(typeof (process.argv[2]) !== 'undefined'){
        console.log("start - "+ process.argv[2]);
        param = JSON.parse(process.argv[2]);
        msgToFrontLogin(param.uid);
    }else{
        msgToFrontLogin(batch_test_robot_list[0]);
    }
};



// -------- robot action  ----------
var batch_test_robot_list =require('./client-user.json');


//多线程启动call by client-ctrl
//clone_start();
//批量注册游客
batch_test_register_guest(1);
//msgToGateRegisterGuest("rt",'aaa');
//批量注册用户
//batch_test_register_user();


