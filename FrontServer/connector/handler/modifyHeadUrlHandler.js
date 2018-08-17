/**
 * 修改头像
 */
var handlerMgr = require("./../handlerMgr");

var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_MODIFY_HEAD,function(packetId, param, next){
    var user = param.user();
    var data = param.data;
    if(!user || user == undefined || data == undefined || data.newHeadUrl == undefined){
        next(1, NID.NI_SC_MODIFY_HEAD, {code : 1,newHeadUrl:""}); return;
    }
    console.log("------------------------103data.newHeadUrl",data.newHeadUrl);
    user.setValue("headImage",data.newHeadUrl);
    user.writeToDb(function(){});

    next(null, NID.NI_SC_MODIFY_HEAD, {code : 0,newHeadUrl:data.newHeadUrl});
   
})
