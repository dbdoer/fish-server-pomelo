/**
 * 定时领奖查询
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var COMM = require("../../../common/commons");

handlerMgr.handler(NID.NI_CS_TIME,function(packetId, param, next){

    var user = param.user();
    //var current = Date.now();
    var info = {
        awards1:0,
        awards2:0,
        awards3:0,
        time: COMM.timestamp()};
    if(!user){
        next(1, NID.NI_SC_TIME, info);
        return;
    }

    if(user.getValue('awards1')*1==0){
        user.setValue("awardsTime", info.time);
        user.writeToDb();
    }


    var curDate = new Date();
    var dbDate = new Date(user.getValue('awardsTime')*1000);
    //console.log("801  dbDate: ", dbDate);
    if(COMM.isSameDate(curDate, dbDate)){
        info.awards1 = user.getValue('awards1');
        info.awards2 = user.getValue('awards2');
        info.awards3 = user.getValue('awards3');
        info.time = user.getValue('awardsTime');
    }
    else{
        user.setValue("awards1", info.awards1);
        user.setValue("awards2", info.awards2);
        user.setValue("awards3", info.awards3);
        user.setValue("awardsTime",info.time);
        //user.setValue(info);
        user.writeToDb();
    }
    
    next(null, NID.NI_SC_TIME, {
        award1:info.awards1*1 ? true:false,
        award2:info.awards2*1 ? true:false,
        award3:info.awards3*1 ? true:false,
        time:info.time,
        timeNow:COMM.timestamp()
    });

})
