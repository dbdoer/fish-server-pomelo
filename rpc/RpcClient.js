"use strict";
/**
 * Created by ck01-441 on 2016/2/26.
 * rpc连接封装 客户端
 * 连接到rpc server端 保存一个远程的function表
 */

var dnode = require("dnode");
var logger = require("../common/logHelper").helper;
var LOCAL_HOST = "127.0.0.1";

module.exports = function (serverId) {
    return new RpcClient(serverId);
};

function RpcClient(serverId) {
    if (!serverId) {
        throw new Error("arguments serverId can not be null");
    }

    var server = serverId.split(":");
    console.log("===>RpcClient Server ", JSON.stringify(server));

    this.isConnected = false; //是否已经连接上
    this.client = null; //连接的客户端对象
    this.remote = null; //远程调用对象
    this.serverId = serverId; //rpcServer对应的id 使用rType:host:port的形式
    this.rType = server[0];// 连接服务器的类型
    this.host = server[1];
    this.port = server[3];
}

var prop = RpcClient.prototype;

prop.connect = function (cb) {
    var self = this;
    this.client = dnode.connect({host: this.host, port: this.port});
    this.client.on("remote", function (remote) {
        self.remote = remote;
        self.isConnected = true;
        cb(self);
    });
    this.client.on("error", function () {
    logger.err(__filename, self.serverId + "             error" + JSON.stringify(arguments) );
        //this.isConnected = false;
    });
    this.client.on("fail", function () {
    logger.err(__filename, self.serverId + "             fail" + JSON.stringify(arguments));
        //this.isConnected = false;
    });
    //this.client.on("end", function () {
    //    this.isConnected = false;
    //});
    this.client.stream.on("close", function (err) {
    logger.err(__filename, self.serverId + "             close" + JSON.stringify(arguments));
        self.isConnected = false;
        if (self.onClose) {
            self.onClose();
        }
    });
};

//返回一个function
prop.getMethod = function (key) {
    if (!this.isConnected)
        return null;
    return this.remote[key];
};

prop.close = function () {
  logger.err(__filename, "             prop.close" + arguments);
    //if (this.isConnected)
    //    this.client.end();
};

prop.setOnClose = function (onClose) {
    this.onClose = onClose;
};