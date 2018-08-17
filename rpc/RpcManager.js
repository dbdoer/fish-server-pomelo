"use strict";
/**
 * Created by 李峥-T_L_CD on 2016/2/26.
 * 当需要连接多组RpcServer时 用于管理rpc连接
 * 根据 配置/传入参数 启动rpc连接并根据rType进行组管理
 * 需要rpc连接时 根据策略返回需要的rpc连接对象 操作尽可能对逻辑层透明
 * TODO 负载均衡(先无视)
 */

var logger = require("../common/logHelper").helper;

function nop() {
}
var RpcClient = require("./RpcClient.js");

module.exports = function (redis) {
    return new RpcManger();
};

var RpcManger = function () {
    this.rpcTable = {}; // serverId -> client
    this.rTypeTable = {}; // rType -> serverIdList
};

var prop = RpcManger.prototype;

//添加一个rpc
prop.addRpcServer = function (serverId, cb) {
    if (!cb)
        cb = nop;

    var server = serverId.split(":");
    var rpcClient = RpcClient(serverId);
    rpcClient.connect(cb);
    if (!this.rTypeTable[server[0]]) {
        this.rTypeTable[server[0]] = [];
    }

    console.log("RpcManager.addRpcServer: " + rpcClient.serverId);
    this.rpcTable[rpcClient.serverId] = rpcClient;
    this.rTypeTable[server[0]].push(rpcClient.serverId)
    rpcClient.setOnClose(function () {

    });
    return rpcClient;

};

/**
 *    参数
 *      [
 *          {rType:type, host:host, port:port},
 *          {rType:type, host:host, port:port},
 *          {rType:type, host:host, port:port},
 *          {rType:type, host:host, port:port}
 *      ]
 * */
prop.addRpcServers = function (serverConfigArray) {
    if (serverConfigArray instanceof Array) {
        for (var i = 0; i < serverConfigArray.length; i++) {
            var config = serverConfigArray[i];
            this.addRpcServer(config["rType"], config["host"], config["port"]);
        }
    }
};

prop.getRTypeList = function () {
    var keys = [];
    for (var k in this.rTypeTable) {
        keys.push(k)
    }
    return keys;
};

prop.getRpcByRType = function (rType) {
    //TODO 负载均衡策略
    var server = null;
    if (this.rTypeTable[rType]) {
        var serverId = this.rTypeTable[rType][0];
        server = this.getRpcByServerId(serverId);
        if (!server) {
            logger.err('RpcManager.getRpcByRType: failed to get rpcServer, serverId:' +serverId);
        }
    }
    return server;
};

prop.getRpcByServerId = function (serverId) {
    var server = this.rpcTable[serverId];
    if (!server) {
        logger.err("RpcManager.getRpcByServerId: error to get rpcServer, serverId: " +serverId);
    }
    return server;
};

prop.getRpcByServerId2 = function () {
    var arrRpcTable = [];
    for (var key in this.rpcTable) {
        arrRpcTable.push(key);
    }
    //console.log("-------------------------------arrRpcTable", arrRpcTable);
    return arrRpcTable;
};

prop.getServerListByRType = function (rType) {
    var serverList = [];
    var ids = this.rTypeTable[rType];
    for (var i = 0; i < ids.length; i++) {
        serverList.push(this.rpcTable[ids[i]]);
    }
    return serverList;
};

prop.removeServerById = function (id) {
    if (!this.rpcTable[id])
        return;
    console.log("RpcManager.removeServerById: " +id);
    this.rpcTable[id].close();
    var rType = id.split(":")[0];
    delete this.rpcTable[id];
    var index;
    if (( index = this.rTypeTable[rType].indexOf(id)) >= 0) {
        this.rTypeTable[rType].splice(index, 1);
    }
};