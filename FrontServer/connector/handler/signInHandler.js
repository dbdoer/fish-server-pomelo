/**
 * 签到
 */
var handlerMgr = require("./../handlerMgr");
var COMM = require("../../../common/commons");
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_SIGN_IN,function(packetId, param, next){
    var resClient = {code: 0, todayIsSign:false, curSignNum:0, curDateDay:0, curMonthNum:0, signRepair:0, claimTotalReward:""};
    var user = param.user();
    if(!user || user == undefined){
        resClient.code = 1;
        next(1, NID.NI_SC_SIGN_IN, resClient); return;
    }

    var nowDate = new Date();
    var signInDate = user.getValue("signInDate");  ///累计签到次数
    var t_signInTime = user.getValue("signInTime"); ///之前签到的时间
    var signRepair = user.getValue("signRepairNum"); ///当月补签次数
    var claimReward = user.getValue("claimTotalReward");///当月领取累计奖励情况
    /// 每日凌晨5点后重置todayIsSign字段
    if(COMM.isSameGameDay(t_signInTime, nowDate.getTime() /1000) == true){
        user.setIsSign(true);
    }
    else{
        user.setIsSign(false);
    }
    /// 只有年份\月份不一致且(日子 == 1号 && 小时 >= 5) 或 日子 > 1号 才重置和更新数据
    t_signInTime = new Date(t_signInTime *1000);
    if((nowDate.getFullYear() != t_signInTime.getFullYear() || nowDate.getMonth() +1 != t_signInTime.getMonth() +1) &&
        ((nowDate.getDate() == 1 && nowDate.getHours() >= 5) || nowDate.getDate() > 1))
    {
        signInDate = 0;
        signRepair = 0;
        claimReward = "";
        user.setValue("signInDate", signInDate);
        user.setValue("signRepairNum", signRepair);
        user.setValue("claimTotalReward", claimReward);
        user.writeByKeysAndValuesToDb(
            ["signInDate","signRepairNum","claimTotalReward"],
            [signInDate,signRepair,claimReward],
            function () {}
        );
    }

    resClient.todayIsSign = user.getIsSign();
    resClient.curSignNum  = signInDate;
    resClient.curDateDay = nowDate.getDate();
    resClient.curMonthNum = nowDate.getMonth() +1;
    resClient.signRepair = signRepair;
    resClient.claimTotalReward = claimReward;
    //console.log("-------------807-->resClient: ", resClient);
    next(null, NID.NI_SC_SIGN_IN, resClient);

})
