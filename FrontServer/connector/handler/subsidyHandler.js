/**
 * 破产补助
 */
var handlerMgr = require("./../handlerMgr");
var COMM = require("../../../common/commons");
var NID = handlerMgr.NET_ID;
var SUBSIDY_MAX_NUM_DAY = 3;  //每日最多补助次数


//msg id 803
handlerMgr.handler(NID.NI_CS_SUBSIDY,function(packetId, param, next){

    var user = param.user();
    var result = {errCode: 0, isPreGetSubsidy : 0, stateNumber: 0,startTime: 0,nowTime: 0};
    if(user == undefined){
        result.errCode = 2;
        next(1, NID.NI_SC_SUBSIDY, result);
        return;
    }
    var gold = user.getValue('gold')*1;
    var subsidyNum = user.getValue('subsidyNum') *1;
    var subsidyStartTime = user.getValue('subsidyStartTime')*1;
    var latelySubsidyTime = user.getValue('latelySubsidyTime')*1;
    //var viplevel = user.getValue("vipLv")*1;
    var curDateTime = new Date();
    var curTimeSecond = COMM.timestamp(Date.now());

    var latelySubsidyDate = new Date( latelySubsidyTime * 1000);
    //console.log("+++++++++++++++++++++++subsidyNum==>: ",subsidyNum);
    /// 是否是新的一天
    if(!COMM.isSameDate(latelySubsidyDate,curDateTime)){
        user.setValue('subsidyNum', 0);
        subsidyNum = 0;
    }

    do {
        if (gold > 0) {
            result.errCode = 1;
            break;
        }

        //一天最大的补助次数超限
        /*if (subsidyNum >= SUBSIDY_MAX_NUM_DAY && viplevel < 5) {
            result.errCode = 3;
            break;
        }else if(subsidyNum >= SUBSIDY_MAX_NUM_DAY + 2 && viplevel >= 5){
            result.errCode = 3;
            break;
        }*/
        if (subsidyNum >= SUBSIDY_MAX_NUM_DAY) {
            result.errCode = 3;
            break;
        }

        //一天之内多次补助之间的CD
        if (subsidyStartTime != null && subsidyStartTime > 0) {
            /*result= {
                isPreGetSubsidy: true,
                stateNumber: subsidyNum*1,
                startTime: subsidyStartTime
            };*/
            result.isPreGetSubsidy = true,
            result.stateNumber = subsidyNum,
            result.startTime = subsidyStartTime
            break;
        }

        //达标
        subsidyStartTime = latelySubsidyTime =curTimeSecond;  /// 记录最近一次破产补助时间 // 记录倒计时开始时间

        result.isPreGetSubsidy = false;
        result.stateNumber = subsidyNum;
        result.startTime = subsidyStartTime;

        user.setValue('subsidyNum',subsidyNum);
        user.setValue('subsidyStartTime',subsidyStartTime);
        user.setValue('latelySubsidyTime',latelySubsidyTime);

        result.nowTime = subsidyStartTime;

        //写档操作
        user.writeToDb(function(){});
    }while (0);

    result.nowTime = curTimeSecond;
    console.log("+++++[803]==NI_CS_SUBSIDY+++result==>: ",result);
    next(null, NID.NI_SC_SUBSIDY, result);
})