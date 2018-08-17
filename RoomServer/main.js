/**
 * Created by ck01-441 on 2016/3/4.
 * 后端房间服务器
 */

//var server = JSON.parse(process.argv[2]);
//if (!server)server = {
//    local: "192.168.24.58",
//    socket: 3001,
//    rpc: 7001,
//    master: {
//        host: "192.168.24.58",
//        port: 6001
//    }
//};


var server;
if(typeof (process.argv[2])  !== 'undefined'){
    server = JSON.parse(process.argv[2]);
}

if(!server){
    var conf = require("../conf/config.json").RoomServer;
    server = {
        local: conf.ip,
        rpc: conf.port,
        http: conf.port,
        socket: conf.port,
        master: conf.master
    }
}

var LOCAL_ADDRESS = server.local; //本机地址
var SOCKET_PORT = server.socket;
var RPC_SOCKET = server.rpc;
var MASTER_INFO = server.master;
var SERVER_TYPE = "RoomServer";    
var serverId = SERVER_TYPE + ":" + LOCAL_ADDRESS + ":" + SOCKET_PORT + ":" + RPC_SOCKET;

var configs = require('../Resources');//加载各个config到内存中
//redis 初始化
var _redis = require("../conf/redis.json");
require("../dao/redis/redis").configure(_redis);
var redis = require('../dao/redis/redisCmd');

var rpcManager = require("../rpc/RpcManager.js")();
var rpcServer = require("../rpc/RpcServer")();
var roomManager = require("./RoomManager")(rpcManager, serverId, MASTER_INFO);
var playerManager = require("./PlayerManager")(roomManager, redis);
//var themeRoom = require("./ThemeRoom")();

var msgManager = require("../common/MsgManager")(rpcManager, rpcServer, playerManager);
var logger = require("../common/logHelper").helper;
logger.info("-------- room server start --------");

msgManager.start();

rpcServer.registerRemoteFunc("msgPacketTrans", function () {
    msgManager.msgPacketTrans.apply(msgManager, arguments);
});

rpcServer.registerRemoteFunc("getMatchOfRoom", function (matchType, roomId, cb) {
    var result = roomManager.getMatchOfRoom(matchType, roomId);
    cb(result);
});

/**
 * 获取RoomServer下的数据
 */
rpcServer.registerRemoteFunc('getRoomServerData', function (roomType, cb) {
    //console.log('=0000000000=sendFullServerNotice==>TransfeServer');
    var result = roomManager.roomTax(roomType);
    console.log('=0000000000=sendFullServerNotice==>result',result);
    cb(null,result);
});

rpcServer.registerRemoteFunc('changeRoomServerCoefficient', function (roomType,gmCoefficient, cb) {
    console.log('-----------------------------roomType,gmCoefficient',roomType,gmCoefficient);
    //var result = gmCommunication.changeCoefficientByGM(roomType);
    var typeList = roomManager.roomList;
    for (var k in typeList) {
        var r = typeList[k];
        //console.log('--------------------r',r);
        if(r){
            if(r.typeId == roomType){
                r.changeCoefficient(roomType,gmCoefficient);
            }

        }
    }
    //roomManager.roomList[roomType].changeCoefficient(gmCoefficient);
    //roomManager.changeCoefficient(roomType,gmCoefficient);
    cb();
});

rpcServer.createServer(RPC_SOCKET);

var DEPENDENCIES_SERVERS = ["FrontServer","TransfeServer"]; //需要通过rpc进行连接的server类型

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
    logger.err(err.stack || err.message);
});