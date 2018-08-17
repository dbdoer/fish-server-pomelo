/**
 * 赠送礼物勾选提示
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var redis = require("../../../dao/redis/redisCmd");

handlerMgr.handler(NID.NI_CS_CHECK_STATE,function(packetId, param, next){
    var session = param.session;
    var user = param.user();
    if(user == undefined || session == undefined){
        next(1, NID.NI_SC_CHECK_STATE, {code:1});
        return;
    }
    var time = new Date();
    var dateY = time.getFullYear();
    var dateM = time.getMonth() +1;
    var dateD = time.getDate();
    if(dateM < 10){
        dateM = "0"+dateM;
    }
    if(dateD < 10){
        dateD = "0"+dateD;
    }
    var _time = dateY+ "-" +dateM+ "-" +dateD;
    var Time = new Date(_time).getTime()*1;
    user.setValue('isChecked',1);
    user.setValue('selectTime',Time);
    user.writeToDb();
    next(null, NID.NI_SC_CHECK_STATE, {code:0});
});
