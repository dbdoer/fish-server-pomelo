/**
 * Created by Author.
 * 快速匹配战斗服务器
 * 比赛模式(或者是比赛模式中的一种)
 */


var server;
if(typeof (process.argv[2])  !== 'undefined'){
    server = JSON.parse(process.argv[2]);
}


var FastMatchServer = require("../conf/config").FastMatchServer;

if (!server)server = {
    //local: "118.193.153.67",
    local: FastMatchServer.ip,
    socket: FastMatchServer.port,
    rpc: FastMatchServer.port,
    master: FastMatchServer.master

};

//if (!server)server = {
//    //local: "118.193.153.67",
//    local: "192.168.24.58",
//    socket: 3001,
//    rpc: 7001,
//    master: {
//        host: "192.168.24.58",
//        port: 6001
//    }
//};




var LOCAL_ADDRESS = server.local; //本机地址
var SOCKET_PORT = server.socket;
var RPC_SOCKET = server.rpc;
var MASTER_INFO = server.master;

var SERVER_TYPE = "FastMatchServer";
var serverId = SERVER_TYPE + ":" + LOCAL_ADDRESS + ":" + SOCKET_PORT + ":" + RPC_SOCKET;

var configs = require('../Resources');//加载各个config到内存中
//var redis = require("../database/redis.js").getCluster();
//redis 初始化
var _redis = require("../conf/redis.json");
require("../dao/redis/redis").configure(_redis);
var redis = require('../dao/redis/redisCmd');


var rpcManager = require("../rpc/RpcManager.js")();
var rpcServer = require("../rpc/RpcServer")();

var playerManager = require("./PlayerManager")(null, redis);
var matchManager = require('./MatchManager')(playerManager,rpcManager);

var msgManager = require("../common/MsgManager")(rpcManager, rpcServer, playerManager);
msgManager.start();

rpcServer.registerRemoteFunc("msgPacketTrans", function () {
    //console.log('====>rpcServer msgPacketTrans==> ',arguments);
    msgManager.msgPacketTrans.apply(msgManager, arguments);
});
//检查是否已经在比赛ing
rpcServer.registerRemoteFunc('inspection', function (uid, cb) {
   cb(matchManager.getInspectionMatch(uid));
});
//报名
rpcServer.registerRemoteFunc('signUp', function (uid, fServerId, matchId, cb) {
    //console.log('=rpcServer==>signUp: ',uid,fServerId,matchId);
    var result = matchManager.signUp(uid, fServerId, matchId);
    cb();
});
//取消报名
rpcServer.registerRemoteFunc('unSignUp', function (uid, matchId, cb) {
    var result = matchManager.unSignUp(uid, matchId);
    cb(result);
});
//创建一场比赛
rpcServer.registerRemoteFunc('createMatch', function (matchId, type, matchServerId, cb) {
    var result = matchManager.createMatch(matchId, type, matchServerId);
    cb();
});

//机器人入场
rpcServer.registerRemoteFunc('enterRobot', function (matchId, num, cb) {
    //console.log('=rpcServer==>signUp: ',uid,fServerId,matchId);
    var result = matchManager.enterRobot(matchId, num);
    cb();
});

//
rpcServer.registerRemoteFunc('updateWaitTime', function (matchId, timeNum, cb) {
    var result = matchManager.updateWaitTime(matchId, timeNum);
    cb();
});

rpcServer.createServer(RPC_SOCKET);

var DEPENDENCIES_SERVERS = ["FrontServer", 'MatchQueueServer','TransfeServer']; //需要通过rpc进行连接的server类型




//redis 初始化
var _redis = require("../conf/redis.json");
require("../dao/redis/redis").configure(_redis);


require("../util/SetupServer.js")(serverId, redis, rpcManager,
    function (rType) {
        for (var i = 0; i < DEPENDENCIES_SERVERS.length; i++) {
            if (rType === DEPENDENCIES_SERVERS[i]) {
                return true;
            }
        }
        return false;
    }, MASTER_INFO, function (type, msg) {
        if (type > 0 && msg.split(":")[0] == 'MatchQueueServer') {
            global.matchQueueId = msg;//临时方案(不好看)
        }
    });


process.on('uncaughtException', function (err) {
    //打印出错误
    console.log(err.stack || err.message);
});


