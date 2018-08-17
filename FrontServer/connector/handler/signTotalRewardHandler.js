/**
 * 签到
 */
var handlerMgr = require("./../handlerMgr");
var COMM = require("../../../common/commons");
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_TOTALSIGN_REWARD,function(packetId, param, next){
    var resClient = {code: 0};
    var user = param.user();
    var data = param.data;
    if(!user || user == undefined){
        resClient.code = 1;
        next(1, NID.NI_SC_TOTALSIGN_REWARD, resClient); return;
    }
    if(data == null || data == undefined || data.rewardWhich == undefined){
        resClient.code = 2;
        next(1, NID.NI_SC_TOTALSIGN_REWARD, resClient); return;
    }

    //console.log("-----------805---> rewardWhich =", data.rewardWhich);
    var gold = user.getValue("gold")*1;
    var gem = user.getValue("gem")*1;
    var glory = user.getValue("glory")*1;
    var signInDate = user.getValue("signInDate")*1;
    var claimTotalInfo = user.getValue("claimTotalReward");
    var g_totalSign = global.totalSignInfo[data.rewardWhich *1];
    if(g_totalSign == null || g_totalSign == undefined || claimTotalInfo == undefined){
        resClient.code = 3;
        next(1, NID.NI_SC_TOTALSIGN_REWARD, resClient); return;
    }
    if(signInDate < data.rewardWhich *1){
        resClient.code = 4;
        next(1, NID.NI_SC_TOTALSIGN_REWARD, resClient); return;
    }

    var temp_claim = claimTotalInfo.split(',');
    /// 是否已经领取过
    if(temp_claim.indexOf(data.rewardWhich +"") >= 0){
        resClient.code = 5;
        next(1, NID.NI_SC_TOTALSIGN_REWARD, resClient); return;
    }

    //console.log("-----------805---> claimTotalInfo =", claimTotalInfo);
    if(g_totalSign.goodId *1 == 1002){ /// 金币
        gold += g_totalSign.goodNum *1;
    }
    else if(g_totalSign.goodId *1 == 1003){ /// 钻石
        gem += g_totalSign.goodNum *1;
    }
    else if(g_totalSign.goodId *1 == 1004){ /// 荣誉值
        glory += g_totalSign.goodNum *1;
    }else {
        user.fillBag([{id: g_totalSign.goodId, type: 4, num: g_totalSign.goodNum}]);
    }
    if(claimTotalInfo == ""){
        claimTotalInfo = "" + data.rewardWhich;
    }else{
        claimTotalInfo = claimTotalInfo + "," + data.rewardWhich ;
    }
    user.setValue("gem",gem);
    user.setValue("gold",gold);
    user.setValue("glory", glory);
    user.setValue("claimTotalReward",claimTotalInfo);
    user.writeByKeysAndValuesToDb(
        ["gem","gold","glory","claimTotalReward"],
        [gem,gold,glory,claimTotalInfo], function () { }
    );
    next(null, NID.NI_SC_TOTALSIGN_REWARD, resClient);

})
