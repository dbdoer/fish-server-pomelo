"use strict";
/**
 * Created by xiahou on 2016/8/31.
 *
 */

var logger = require("../common/logHelper").helper;

var REDIS_KEY_USER_TO_UID = "user2uid:";
var REDIS_KEY_USER_INFO = "fish4user:";
var REDIS_KEY_ONLINE_USER_LIST = "fish4online_users:";//在线用户列表
var serverConfig;
if(typeof (process.argv[2])  !== 'undefined'){
    serverConfig = JSON.parse(process.argv[2]);
}

var gs = require("../conf/config.json").TransfeServer;
if(!serverConfig){
    serverConfig = {
        local: gs.ip,
        rpc: gs.port,
        http: gs.port,
        socket: gs.port,
        master:gs.master      //TODO 提取到config中
    }
}

//console.log("=123123123==>serverConfig: ",JSON.stringify(serverConfig));
var LOCAL_ADDRESS = serverConfig.local; //本机地址
var PORT = serverConfig.socket;
var RPC_SOCKET = serverConfig.rpc;
var MASTER_INFO = serverConfig.master;

var serverId = "TransfeServer:" + LOCAL_ADDRESS + ":" + PORT + ":" + RPC_SOCKET;

//var redis = require("../database/redis.js").getCluster();
var _redis = require("../conf/redis.json");
require("../dao/redis/redis").configure(_redis);
var redis = require('../dao/redis/redisCmd');


var rpcManager = require("../rpc/RpcManager.js")();
var rpcServer = require("../rpc/RpcServer")();
rpcServer.createServer(RPC_SOCKET);
/**
 * 发送全服公告
 * param = {noticeType:0, playerInfo:{}, content:[]}
 */
rpcServer.registerRemoteFunc('sendFullServerNotice', function (param, cb) {
    //console.log('=0000000000=sendFullServerNotice==>TransfeServer');
    var rpcFs = rpcManager.getRpcByRType('FrontServer');
    if (!rpcFs) {
        cb(1);
        return;
    }
    var method = rpcFs.getMethod('sendNoticeToFrontServer');
    if (!method) {
        cb(1);
        return;
    }
    if(param == undefined){
        cb(2);
        return;
    }
    method(param.noticeType, param.playerInfo, param.fishInfo,param.content, function (err, result) {
        if (err || result == undefined) {
            cb(3);
            return;
        }
        cb();
    });
});

rpcServer.registerRemoteFunc('sendMailInfo', function (param, cb){
    var rpcFs = rpcManager.getRpcByRType('FrontServer');
    if (!rpcFs) {
        cb(1);
        return;
    }
    var method = rpcFs.getMethod('sendMailToFrontServer');
    if (!method) {
        cb(1);
        return;
    }
    if(param == undefined){
        cb(2);
        return;
    }
    method(param.sendType, param.mailInfo, param.userInfo, function (err, result) {
        if (err || result == undefined) {
            cb(3);
            return;
        }
        cb();
    });
});

process.on('uncaughtException', function (err) {
    //打印出错误
    logger.err(err.stack || err.message);
});

var DEPENDENCIES_SERVERS = ["FrontServer"]; //需要通过rpc进行连接的server类型
require("../util/SetupServer.js")(serverId, redis, rpcManager,
    function (rType) {
        for (var i = 0; i < DEPENDENCIES_SERVERS.length; i++) {
            if (rType === DEPENDENCIES_SERVERS[i]) {
                return true;
            }
        }
        return false;
    }, MASTER_INFO);



rpcServer.registerRemoteFunc('forwardKickUser', function (param, cb){
    var rpcServer = rpcManager.getRpcByServerId(param[0]);
    if (!rpcServer) {
        logger.err('TransfeServer.main.regis_forwardKickUser: failed to get rpcServer, Id:' +param[0]);
        cb(1);
        return;
    }
    var method = rpcServer.getMethod('kickUser');
    if (!method) {
        logger.err('TransfeServer.main.regis_forwardKickUser: failed to getMethod(kickUser)');
        cb(1);
        return;
    }

    method(param[1], function (err, result) {
        if (err || result == undefined) {
            cb(3);
            return;
        }
        cb();
    });
});
