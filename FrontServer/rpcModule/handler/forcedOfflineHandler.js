/**
 * 强制下线
 */
var rpcMgr = require("../rpcMgr");
var rpcID = require("../rpcID");


rpcMgr.handler(rpcID.RPC_FORCED_OFFLINE,function(uid, param, cb) {
    var session = param.session;
    if(!session){
        cb('error');
        return;
    }

    var u =  session.getUser(uid);
    if(!u){
        cb("no user");
        return ;
    }

    //释放销毁
    u.getSoket().destroy();


    session.deleteSessionByUid(uid);
    cb();
});
