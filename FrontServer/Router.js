"use strict";
/**
 * Created by ck01-441 on 2016/2/27.
 * 加载某路径下的逻辑module
 * 进行请求分发
 * TODO 添加pattern区分 使客户端可以直接向后端服务器申请转发(不一定要)
 */

var fs = require("fs");
var path = require("path");

module.exports = function (session, rpcManager, redis) {
    return new Router(session, rpcManager, redis);
};

function Router(session, rpcManager, redis) {
    this._modules = {};
    this.session = session;
    this.rpcManager = rpcManager;
    this.redis = redis;
}

Router.prototype.loadModule = function (cmd, func) {
    if (typeof(func) == "function") {
        this._modules[cmd] = func;
    } else if (typeof func == "object") {
        for (var k in func) {
            if (k[0] != "_") {
                this.loadModule(cmd + "." + k, func[k]);
            }
        }
    }
};

//规则路由
Router.prototype.loadDir = function (dir) {
    dir = path.resolve(dir);
    var files = fs.readdirSync(dir);
    for (var i = 0; i < files.length; i++) {
        var match = /^(.*)\.js$/.exec(files[i]);
        if (match) {
            var modulename = match[1];
            var fn = path.join(dir, files[i]);
            if (fs.statSync(fn).isFile()) {
                var module = require(fn)(this.session);
                this.loadModule(modulename, module);
            }
        }
    }
};

//临时路由 数字(统一转成string)
Router.prototype.loadLogicFile = function (dir) {
    var modules = require(dir)(this.session, this.rpcManager, this.redis);
    for (var k in modules) {
        this.loadModule(k, modules[k]);
    }
};

Router.prototype.processRequest = function (sid, uid, cmd, data, cb) {

    if (this._modules[cmd]) {
        this._modules[cmd](sid, uid, data, cb);
        return true;
    }
};