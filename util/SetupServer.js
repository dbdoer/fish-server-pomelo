"use strict";
/**
 * Created by ck01-441 on 2016/2/27.
 * server启动步骤
 * 从redis中获取已经启动server 根据filter添加rpc链接
 * 向redis的online server中添加自己
 * 在redis中订阅新服务器添加的消息
 * 当server崩溃或者其他原因关闭时注销掉在redis中的注册 并广播
 */ 

function nop() {
}

var REDIS_KEY_ONLINE_SERVER = "fish4online_servers";
var CHANNEL_ADD = "rpc_server_add";
var CHANNEL_REMOVED = "rpc_server_removed";
var HEART_BEAT_INTERVAL = 3000;
var pubRedisClient = require("../database/redis.js").getCluster();
//var pubRedisClient = require('../dao/redis/redisCmd');
var logger = require("../common/logHelper").helper;

/**
 * @param serverId 包含本server自身信息组成的唯一id
 * @param redis_cli redis链接
 * @param rpcManager
 * @param rTypeFilter 一个function对象 会传入rType 返回true则将建立对应rpc链接 否则不建立
 * @param master MasterServer信息每一个需要对外开放rpc的server都需要向MasterServer注册
 * @param onServerChanged 当连接的服务器发生变化(添加或移除)时触发
 * @return {void}
 * */
module.exports = function (serverId, redis_cli, rpcManager, rTypeFilter, master, onServerChanged) {
    logger.debug('SetupServer: init. serverId:' +serverId);

    if (!rTypeFilter)
        rTypeFilter = defaultFilter;

    //获取所有在线SERVER列表
    redis_cli.lrange(REDIS_KEY_ONLINE_SERVER, 0, -1, function (err, result) {
        if (result) {
            var cleanList = cleanArray(result);
            for (var i = 0; i < cleanList.length; i++) {
                var flag = checkAndAdd(cleanList[i], rTypeFilter, rpcManager, serverId);
                if (flag && onServerChanged) {
                    onServerChanged(1, cleanList[i]);
                }
            }
        }

        redis_cli.lrem(REDIS_KEY_ONLINE_SERVER, 0, serverId);

        // 注册新server事件
        pubRedisClient.on("message", function (channel, msg) {
            if (channel === CHANNEL_ADD) {
                var flag = checkAndAdd(msg, rTypeFilter, rpcManager, serverId);
                if (flag && onServerChanged) {
                    onServerChanged(1, msg);
                }
            } else if (channel === CHANNEL_REMOVED) {
                if (onServerChanged) {
                    onServerChanged(-1, msg);
                }
                rpcManager.removeServerById(msg);
            }
        });
        pubRedisClient.subscribe(CHANNEL_ADD);
        pubRedisClient.subscribe(CHANNEL_REMOVED);

        var masterClient = rpcManager.addRpcServer("MasterServer:" + master.host + ":0:" + master.port, function () {
            masterClient.getMethod("register")(serverId, function () {
                var interval = setInterval(function () {
                    var tempRpc = masterClient.getMethod("heartBeat");
                    if(tempRpc == undefined || !tempRpc) {
                        logger.err("SetupServer: error to getMethod(heartBeat), serverId:" +serverId);
                        return;
                    }
                    masterClient.getMethod("heartBeat")(serverId, nop);
                }, HEART_BEAT_INTERVAL);
            });
        });
    });
};

function cleanArray(list) {
    if (list.length == 0)return [];

    var n = [list[0]]; //结果数组
    for (var i = 1; i < list.length; i++) {                    //从第二项开始遍历
        //如果当前数组的第i项在当前数组中第一次出现的位置不是i，
        //那么表示第i项是重复的，忽略掉。否则存入结果数组
        if (list.indexOf(list[i]) == i) n.push(list[i]);
    }
    return n;
}

function formatServerId(id) {
    var t = id.split(":");
    return {
        rType: t[0],
        host: t[1],
        port: t[3]
    };
}

function checkAndAdd(id, filter, rpcManager, self) {
    //console.log('check and add ==> ' + id);
    var rpcObj = formatServerId(id);
    if (filter(rpcObj.rType) && id !== self) {
        rpcManager.addRpcServer(id);
        return true;
    }
    return false;
}

function defaultFilter() {
    return true;
}