/**
 * Created with JetBrains WebStorm.
*/

var _ = require("underscore");
var fs = require("fs");
var path = require("path");

var RPC_ID =  require("./rpcID");

var rpcMgr = module.exports;
rpcMgr.NET_ID = RPC_ID;
rpcMgr.container = [];

rpcMgr.handler = function( mid, cb) {
    this.container[mid] = cb;
};

//, cb
rpcMgr.trigger = function(mid, uid, param, next ) {
    if( _.isString(mid) ){
        mid = parseInt(mid);
    }
    
    if( this.container[mid] ){
        this.container[mid](uid, param, next);
    }else{
        console.log("error no RPC handler = %d", mid);
    }
};


/**
 * 消息注册
 */
rpcMgr.register = function() {
        var dir = "./FrontServer/rpcModule/handler/";
        dir = path.resolve(dir);


        var files = fs.readdirSync(dir);
        for (var i = 0; i < files.length; i++) {
            var match = /^(.*)\.js$/.exec(files[i]);
            if (match) {
                var modulename = match[1];
                var fn = path.join(dir, files[i]);
                if (fs.statSync(fn).isFile()) {
                    //console.log("------fn =======\n" +  fn);
                    require(fn);
                }
            }
        }
};

