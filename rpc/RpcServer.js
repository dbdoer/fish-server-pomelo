"use strict";
/**
 * Created by ck01-441 on 2016/2/26.
 * rpc 调用封装 服务端
 * TODO 需要一些默认的必须实现的远程方法
 * TODO 用来接收master服务器对于服务器变动时的广播以及做出相应的响应
 */


var dnode = require("dnode");

var DEFAULT_OPTION = {}; //默认配置

module.exports = function (options) {
    return new RpcServer(options);
};

function RpcServer(options) {
    this.remoteFuncTable = {};
    this.server = null;
}

var prop = RpcServer.prototype;

/**
 * 创建server需要在注册远程调用方法之后
 * */
prop.createServer = function (port) {
    this.server = dnode(this.remoteFuncTable);
    console.log('=prop.createServer==>port = ',port,this.remoteFuncTable);
    this.server.listen(port);
};

//注册远程调用方法
//诡异的写法为了适配传递参数兼容两种格式
prop.registerRemoteFunc = function (key, func) {
    var funcTable = {};
    if (typeof key === "object") {
        funcTable = key;
    } else {
        funcTable[key] = func;
    }
    for (var k in funcTable) {
        this.remoteFuncTable[k] = funcTable[k];
    }
};
