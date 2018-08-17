/**
 * 签到领奖
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var COMM = require("../../../common/commons");
var redis2mysql = require('../../../dao/redis2mysql');

handlerMgr.handler(NID.NI_CS_SIGN_IN_AWARD,function(packetId, param, next){
    var user = param.user();
    var resClient = {code:0};
    if(!user){
        resClient.code = 1;
        next(1, NID.NI_SC_SIGN_IN_AWARD, resClient);
        return;
    }
    var gold = user.getValue("gold")*1;
    var gem = user.getValue("gem")*1;
    var glory = user.getValue("glory")*1;
    var vipLevel = user.getValue("vipLv")*1;
    
    var signInDate = user.getValue("signInDate") *1;
    var signInTime = user.getValue("signInTime") *1;
    var signRepair = user.getValue("signRepairNum") *1;
    var dayNum = user.getValue("dayNum")*1;
    var goldByPurchase = user.getValue("goldByPurchase")*1;
    var gemByPurchase = user.getValue("gemByPurchase")*1;
    var bullionByGet = user.getValue("bullionByGet")*1;
    var boxByGet = user.getValue("boxByGet")*1;
    var yesterdayGold = user.getValue("yesterdayGold")*1;
    var yesterdayGem = user.getValue("yesterdayGem")*1;
    var yesterdayBullion = user.getValue("yesterdayBullion")*1;
    var yesterdayBox = user.getValue("yesterdayBox")*1;

    var nowDate = new Date();
    signInTime = new Date(signInTime * 1000);   ///之前签到的时间转时间格式
    //console.log("-------------808--->signInDate: ",signInDate, nowDate.getDate());
    if(signInDate +1 > nowDate.getDate()){  /// 签到的总次数大于当前日期天数
        resClient.code = 2;
        next(1, NID.NI_SC_SIGN_IN_AWARD, resClient);return;
    }

    function giveoutGoods(dayNum) {
        var g_signData = global.signInfo[dayNum];
        //console.log("-------------808--->g_signData: ",g_signData);
        if(g_signData == undefined || g_signData.goodId == undefined){
            return -1;
        }
        var rewardNum = g_signData.goodNum *1 || 0;
        if(g_signData.vip *1 > 0 && vipLevel >= g_signData.vip *1){
            rewardNum = rewardNum *2;
        }

        if(g_signData.goodId *1 == 1002){ /// 金币
            gold += rewardNum;
        }
        else if(g_signData.goodId *1 == 1003){ /// 钻石
            gem += rewardNum;
        }
        else if(g_signData.goodId *1 == 1004){ /// 荣誉值
            glory += rewardNum;
        }
        else if(g_signData.goodId *1 == 10119 || g_signData.goodId *1 == 10120){ /// 炮台皮肤
            var retNum = user.addUnlockSkin(g_signData.goodId *1);
            if(retNum < 0){
                console.log('====> this skin id %d is err <=====', g_signData.goodId *1);
            }
        }else {
            user.fillBag([{id: g_signData.goodId, type: 4, num: rewardNum}]);
        }
        return 0;
    }

    var resNum = 0;
    var repairCostGemNum = 0;
    /// 当天是否签到过
    if(signInTime.getDate() != nowDate.getDate()){
        //console.log("--sign--808--->signInTime: ",signInTime.getDate(), nowDate.getDate());
        resNum = giveoutGoods(signInDate +1);
    }
    else {
        var repairTotalNum = nowDate.getDate() - signInDate;  ///实际日期与签到的次数相差
        //console.log("--again-sign--808--->repairTotalNum: ",repairTotalNum);
        if (repairTotalNum <= 0 && signInTime.getDate() == nowDate.getDate()) {
            resClient.code = 3;
            next(1, NID.NI_SC_SIGN_IN_AWARD, resClient);return;
        }

        /// 判断补签所扣花费
        if(signRepair +1 == 2){
            repairCostGemNum = 10;
        }else if(signRepair +1 == 3){
            repairCostGemNum = 30;
        }else if(signRepair +1 == 4){
            repairCostGemNum = 50;
        }else if(signRepair +1 > 4){
            repairCostGemNum = 100;
        }
        if(repairCostGemNum > gem){
            resClient.code = 4;
            next(1, NID.NI_SC_SIGN_IN_AWARD, resClient);return;
        }
        signRepair = signRepair + 1;
        resNum = giveoutGoods(signInDate +1);
    }

    //console.log("-------------808--->resNum: ",resNum);
    if(resNum < 0){
        resClient.code = 9;
        next(1, NID.NI_SC_SIGN_IN_AWARD, resClient);return;
    }

    gem -= repairCostGemNum; /// 扣除补签的花费
    user.setValue("signInDate", signInDate +1);
    user.setValue("signInTime", nowDate.getTime() /1000);
    user.setValue("signRepairNum", signRepair);

    redis2mysql.RedisUpdateUserGoldChange([
        (gold -yesterdayGold - goldByPurchase)
        ,(gem -yesterdayGem- gemByPurchase)
        ,(bullionByGet - yesterdayBullion)
        ,(boxByGet - yesterdayBox)
        ,user.getValue('outsideUuid')
    ]);
    user.setValue("yesterdayGold",gold);
    user.setValue("yesterdayGem",gem);
    user.setValue("yesterdayBullion", bullionByGet);
    user.setValue("yesterdayBox", boxByGet);

    user.setValue("dayNum",dayNum);
    user.setValue("newUser",1);
    user.setValue("glory",glory);
    user.setValue("gem",gem);
    user.setValue("gold",gold);
    user.writeToDb();
    
    next(null, NID.NI_SC_SIGN_IN_AWARD, resClient);
})
