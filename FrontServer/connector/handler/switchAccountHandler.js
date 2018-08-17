/**
 * 切换账号
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
handlerMgr.handler(NID.NI_CS_ACCOUNT_SWITCH,function(packetId, param, next){
    var session = param.session;
    var user = param.user();
    if(!session || user == undefined || user.getUid() == undefined){
        next(1, NID.NI_SC_ACCOUNT_SWITCH, {code: false});
        return;
    }

    console.log("=4100===> NI_CS_ACCOUNT_SWITCH uid = " , user.getUid());

    /// 先发送消息再销毁session
    next(null, NID.NI_SC_ACCOUNT_SWITCH, {code: true});
    //释放销毁
    var t_waitTime = setTimeout(function () {
        console.log("=4100===> t_waitTime <=====");
        user.getSoket().destroy();
        session.deleteSessionByUid(user.getUid());
    },2 *1000);
})
