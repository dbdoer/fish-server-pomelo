/**
 * 在线奖励领取状态列表
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var onlineReward = require('../../../Resources/onlinereward');
var COMM = require("../../../common/commons");

handlerMgr.handler(NID.NI_CS_ONLINE_AWARD_LIST,function(packetId, param, next){
    //console.log("------------------------710");
    var user = param.user();
    if(user == undefined || user == null){
        console.log("===710 NI_CS_FIRE ===>user || data == undefined");
        next(1,  NID.NI_SC_ONLINE_AWARD_LIST, {err:1,state:[],time:0});
        return;
    }
    var info = {
        onlineAwards1:0,
        onlineAwards2:0,
        onlineAwards3:0 };
    var curDate = new Date();
    var dbDate = new Date(user.getValue('awardsTime2')*1000);
    
    if(COMM.isSameDate(curDate, dbDate)){
        info.onlineAwards1 = user.getValue('onlineAwards1')*1;
        info.onlineAwards2 = user.getValue('onlineAwards2')*1;
        info.onlineAwards3 = user.getValue('onlineAwards3')*1;
        //info.time = user.getValue('awardsTime');
    }
    else{
        user.setValue("onlineAwards1", 0);
        user.setValue("onlineAwards2", 0);
        user.setValue("onlineAwards3", 0);
        user.setValue("awardsTime2",COMM.timestamp());
        user.setValue("totalTimeOneDay",0);
    }

    var length = Object.keys(onlineReward).length;
    var state = new Array(length);
    state[0] = info.onlineAwards1;
    state[1] = info.onlineAwards2;
    state[2] = info.onlineAwards3;
    var totalTime = user.getValue('totalTimeOneDay')*1;
    user.writeToDb();
    //console.log("------------------------710 state totalTime",state,totalTime);
    next(null,  NID.NI_SC_ONLINE_AWARD_LIST, {err:0,state:state,time:totalTime});
})
