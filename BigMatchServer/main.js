/**
 * Created by xiahou on 2016/7/12.
 * 快速匹配战斗服务器
 * 大奖赛模式(或者是比赛模式中的一种)
 */


var server;
if(typeof (process.argv[2])  !== 'undefined'){
    server = JSON.parse(process.argv[2]);
}

var BigMatchServer = require("../conf/config").BigMatchServer;

if (!server) {
    server = {
        local: BigMatchServer.ip,
        socket: BigMatchServer.port,
        rpc: BigMatchServer.port,
        master: BigMatchServer.master
    };
}

var LOCAL_ADDRESS = server.local; //本机地址
var SOCKET_PORT = server.socket;
var RPC_SOCKET = server.rpc;
var MASTER_INFO = server.master;

var SERVER_TYPE = "BigMatchServer";
var serverId = SERVER_TYPE + ":" + LOCAL_ADDRESS + ":" + SOCKET_PORT + ":" + RPC_SOCKET;

require('../Resources');//加载各个config到内存中

var _redis = require("../conf/redis.json");
require("../dao/redis/redis").configure(_redis);
//var redis = require('../dao/redis/redisCmd');
var redis = require("../database/redis.js").getCluster();

var rpcManager = require("../rpc/RpcManager.js")();
var rpcServer = require("../rpc/RpcServer")();

var playerManager = require("./PlayerManager")(redis);
var matchManager = require('./MatchManager')(serverId, rpcManager, playerManager, redis);
var msgManager = require("../common/MsgManager")(rpcManager, rpcServer, playerManager);
msgManager.start();

rpcServer.registerRemoteFunc("msgPacketTrans", function () {
    //console.log('====>rpcServer msgPacketTrans==> ',arguments);
    msgManager.msgPacketTrans.apply(msgManager, arguments);
});
//获取比赛数据
rpcServer.registerRemoteFunc('getBigMatchInfo', function (cb) {
    var result = matchManager.getBigMatchInfo();
    if(result == undefined){
        cb(1, null);return;
    }
    cb(null,result);
});
//获取玩家得分
rpcServer.registerRemoteFunc('getBigMatchScore', function (playerUid, cb) {
    var result = matchManager.getSelfBigMatchScore(playerUid);
    if(result == undefined || result == null){
        cb(1, null);return;
    }
    cb(null,result);
});
//参加一场比赛
rpcServer.registerRemoteFunc('joinBigMatchById', function (serverId, playerUid, resData, playerInfo, cb) {
    matchManager.joinBigMatchById(serverId, playerUid, resData, playerInfo, cb);
});
//获取比赛中的个人数据
rpcServer.registerRemoteFunc('getBigMatchOfSelfInfo', function (playerUid, cb) {
    //console.log('---------------------getBigMatchOfSelfInfo ');
    var result = matchManager.getBigMatchOfSelfInfoByUid(playerUid);
    if(result == undefined){
        cb(1, null);return;
    }
    cb(null,result);
});


rpcServer.createServer(RPC_SOCKET);

var DEPENDENCIES_SERVERS = ["FrontServer", 'TransfeServer']; //需要通过rpc进行连接的server类型

require("../util/SetupServer.js")(serverId, redis, rpcManager,
    function (rType) {
        for (var i = 0; i < DEPENDENCIES_SERVERS.length; i++) {
            if (rType === DEPENDENCIES_SERVERS[i]) {
                return true;
            }
        }
        return false;
    }, MASTER_INFO);



process.on('uncaughtException', function (err) {
    //打印出错误
    console.log(err.stack || err.message);
});