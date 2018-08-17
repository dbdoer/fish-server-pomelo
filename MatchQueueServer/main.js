/**
 * Created by 李峥 on 2016/4/20.
 * 比赛模式的排队及信息汇总
 * 单方面被FrontServer连接
 * 与所有MatchServer互相连接
 */




var server;
if(typeof (process.argv[2])  !== 'undefined'){
    server = JSON.parse(process.argv[2]);
}

var MatchQueueServer = require("../conf/config").MatchQueueServer;
if (!server)server = {
    local: MatchQueueServer.ip,
    socket: MatchQueueServer.port,
    rpc: MatchQueueServer.port,
    master: MatchQueueServer.master

};


//var server = JSON.parse(process.argv[2]);
if (!server)return;//没配置不给默认配置 不进行启动
var LOCAL_ADDRESS = server.local; //本机地址
var SOCKET_PORT = server.socket;
var RPC_SOCKET = server.rpc;
var MASTER_INFO = server.master;

var SERVER_TYPE = "MatchQueueServer";
var serverId = SERVER_TYPE + ":" + LOCAL_ADDRESS + ":" + SOCKET_PORT + ":" + RPC_SOCKET;

var configs = require('../Resources');//加载各个config到内存中
//redis 初始化
var _redis = require("../conf/redis.json");
require("../dao/redis/redis").configure(_redis);
var redis = require('../dao/redis/redisCmd');
//var redis = require("../database/redis.js").getCluster();
var rpcManager = require("../rpc/RpcManager.js")();
var rpcServer = require("../rpc/RpcServer")();


var rpcModule = require('./rpcModule')(redis, rpcManager, rpcServer);
rpcServer.createServer(RPC_SOCKET);

var DEPENDENCIES_SERVERS = ["FastMatchServer"]; //需要通过rpc进行连接的server类型

process.on('uncaughtException', function (err) {
    //打印出错误
    console.log(err.stack || err.message);
});

require("../util/SetupServer.js")(serverId, redis, rpcManager,
    function (rType) {
        for (var i = 0; i < DEPENDENCIES_SERVERS.length; i++) {
            if (rType === DEPENDENCIES_SERVERS[i]) {
                return true;
            }
        }
        return false;
    }, MASTER_INFO, function (type, serverId) {
        rpcModule.onServerChanged(type, serverId);
    });