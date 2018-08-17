"use strict";
/**
 * Created by ck01-441 on 2016/3/3.
 * master server 对全部在线的服务器进行监控
 * 心跳
 * 维护在线列表
 * 应该是所有服务器中最先启动的
 */

var logger = require("../common/logHelper").helper;

//redis 初始化
var _redis = require("../conf/redis.json");
require("../dao/redis/redis").configure(_redis);

var redis = require("../database/redis.js").getCluster();
var rpcServer = require("../rpc/RpcServer")();
var conf_master = require("../conf/config.json").MasterServer;

var HEART_BEAT_TIME = 10000;//1000*3600*24; //心跳5s有效
var ONLINE_KEY = "fish4online_servers";
var CHANNEL_ADD = "rpc_server_add";
var CHANNEL_REMOVED = "rpc_server_removed";

/**
 * {
 *     serverId:{
 *         type:type,
 *         host:host,
 *         client:client(不一定有),
 *         port:port,
 *         rpcPort:rpcPort,
 *         timeout:timeout(超时清除redis记录并广播),
 *         roomStatus:{}(房间状态 RoomServer独有 同时向所有连接的FrontServer广播. ps:roomStatus中可以包含)
 *     }
 * }
 * */
var onlineServers = {};

rpcServer.registerRemoteFunc("register", function (serverId, cb) {
    //console.log('MasterServer.main.regis_register: entered. serverId: ' +serverId);
    if (onlineServers[serverId] && onlineServers[serverId].timeout) {
        logger.debug('MasterServer.main.regis_register: clearTimeout serverId: ' +serverId);
        clearTimeout(onlineServers[serverId].timeout);
        onlineServers[serverId].timeout = null;
    }
    if (!cb) {
        cb = nop;
    }
    //第一次注册serverId
    var server = formatServerId(serverId);
    onlineServers[serverId] = server;
    redis.lpush(ONLINE_KEY, serverId, function (err, result) {
        //logger.debug('MasterServer.main.regis_register: add serverId: ' +serverId);
        redis.publish(CHANNEL_ADD, serverId);
    });
    server.timeout = setTimeoutFunc(serverId);
    cb();
    //console.log('MasterServer.main.regis_register: leaved.');
});

rpcServer.registerRemoteFunc("heartBeat", function (serverId, cb) {
    //console.log('MasterServer.main.regis_heartBeat: entered. serverId: ' +serverId);
    if (!cb) {
        cb = nop;
    }
    var server = onlineServers[serverId];
    if (!server) {
        logger.err('MasterServer.main.regis_heartBeat: error to get, will add. serverId: ' +serverId);

        server = formatServerId(serverId);
        onlineServers[serverId] = server;
        redis.lpush(ONLINE_KEY, serverId, function (err, result) {
            redis.publish(CHANNEL_ADD, serverId);
        });
        server.timeout = setTimeoutFunc(serverId);
        return cb();
    }
    clearTimeout(server.timeout);
    server.timeout = setTimeoutFunc(serverId);
    cb();
    //console.log('MasterServer.main.regis_heartBeat: leaved.');
});

//供RoomServer调用 用于存放所有RoomServer中房间的信息 供FrontServer查询
rpcServer.registerRemoteFunc("syncRoomStatus", function (serverId, roomStatus) {
    //console.log('MasterServer.main.regis_syncRoomStatus: entered. serverId: ' +serverId);
    var server = onlineServers[serverId];
    if (!server) {
        logger.err('MasterServer.main.regis_syncRoomStatus: error to get, will add. serverId: ' +serverId);

        server = formatServerId(serverId);
        onlineServers[serverId] = server;
        redis.lpush(ONLINE_KEY, serverId, function (err, result) {
            redis.publish(CHANNEL_ADD, serverId);
        });
        server.timeout = setTimeoutFunc(serverId);
        return;
    }
    server.roomStatus = roomStatus;
    console.log('MasterServer.main.regis_syncRoomStatus: roomStatus: ' +JSON.stringify(roomStatus));
});

//供FrontServer调用 用于获取当前所有RoomServer中的状态(基本上是负载状态)
rpcServer.registerRemoteFunc("getRoomStatus", function (cb) {
    //console.log('MasterServer.main.regis_getRoomStatus: entered. onlineServers:' +JSON.stringify(onlineServers));
    if (!cb || typeof (cb) !== "function")
        return;

    var info = {};
    for (var k in onlineServers) {
        if (onlineServers[k].type == "RoomServer") {
            info[k] = onlineServers[k].roomStatus;
            //console.log('MasterServer.main.regis_getRoomStatus: RoomServer:' +JSON.stringify(info[k]));
        }
    }
    cb(info);
    //console.log('MasterServer.main.regis_getRoomStatus: leaved. info: ' +JSON.stringify(info));
});

function formatServerId(id) {
    var result = id.split(":");
    return {
        type: result[0],
        host: result[1],
        socketPort: result[2],
        rpcPort: result[3]
    };
}

function setTimeoutFunc(serverId) {
    return setTimeout(function () {
        logger.debug('MasterServer.main.setTimeoutFunc: delete onlineServer:' +serverId);
        delete onlineServers[serverId];
        redis.lrem(ONLINE_KEY, 0, serverId);
        redis.publish(CHANNEL_REMOVED, serverId);
    }, HEART_BEAT_TIME)
}

process.on('uncaughtException', function (err) {
    //打印出错误
    logger.err(err.stack || err.message);
});

redis.del(ONLINE_KEY, function(err, reply) {
    logger.debug('MasterServer.main.redis_del: entered.');
    rpcServer.createServer(conf_master.port);
});
