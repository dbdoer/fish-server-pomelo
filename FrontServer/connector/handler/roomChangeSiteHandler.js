/**
 * 变换座位
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var roomManager = global.roomManager;

handlerMgr.handler(NID.NI_CS_CHANGE_SITE,function(packetId, param, next){
    var user = param.user();
    var data = param.data;
    if(user == undefined || data == undefined){
        next(1, NID.NI_SC_CHANGE_SITE, {err: 1, newSite: 0});
        return;
    }
    user.rpcTrans('changeSite',  [data.toSite], function (err, newSite) {
            next(null, NID.NI_SC_CHANGE_SITE, {err: err, newSite: newSite});
        });
})
