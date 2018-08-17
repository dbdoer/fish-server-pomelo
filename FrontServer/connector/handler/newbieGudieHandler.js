/**
 * 新手引导
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var logger = require("../../../common/logHelper").helper;

handlerMgr.handler(NID.NI_CS_GUIDE_STEP,function(packetId, param, next){
    var user = param.user();
    var data = param.data;
    if(data == undefined || user == undefined || data.fishTypePos == undefined) {
        next(1, NID.NI_SC_GUIDE_STEP, {code: 1});
        return ;
    }

    var tempData = data.fishTypePos *1;
    var gudieNum = user.getValue("guideStep") *1;
    //console.log("==4230==111111111==>gudieNum: %s, fishTypePos: %s",gudieNum,tempData);
    if(gudieNum >= global.guideStepDetail.GuideEnd){
        next(1, NID.NI_SC_GUIDE_STEP, {code: 2});
        return ;
    }
    if( tempData == global.guideStepDetail.SharkDead || tempData == global.guideStepDetail.TaskFishDead ||
        tempData == global.guideStepDetail.HuoLongDead)
    {
        user.rpcTrans('guideSetCapture', [tempData], function (err) {
            console.log('===4230==>guideCapture err: %s, end', err);
            if(err || err != null){
                next(1, NID.NI_SC_GUIDE_STEP, {code: 3});
                return ;
            }

            next(null, NID.NI_SC_GUIDE_STEP, {code: 0});
            return ;
        });
    }
    else if(tempData == global.guideStepDetail.RewardGiftbag && gudieNum == global.guideStepDetail.RewardGiftbag){
        /// ---- reward player of newbie gift bag ----
        var tempItemIds = global.guideInfo.Guide_prop_id.split("|");
        var tempItemNums = global.guideInfo.Guide_prop_num.split("|");
        var rewardGold = global.guideInfo.Guide_bonus *1;
        if(rewardGold != undefined && rewardGold > 0)
            user.acceptGold(rewardGold); ///添加彩金奖励

        if(tempItemIds == undefined || tempItemIds.length <= 0 || tempItemNums == undefined){
            next(1, NID.NI_SC_GUIDE_STEP, {code: 4});
            return;
        }
        ////物品添加的操作 start
        var arr = [];
        for(var i = 0; i< tempItemIds.length; i++){
            if(tempItemIds[i] *1 == 1002){
                user.acceptGold(tempItemNums[i] *1);
            }
            else if(tempItemIds[i] *1 == 1003){
                user.acceptGem(tempItemNums[i] *1);
            }
            else if(tempItemIds[i] *1 == 1004){
                user.acceptGlory(tempItemNums[i] *1);
            }else {
                var g_propData = global.prop[tempItemIds[i]];
                if(g_propData == undefined){
                    logger.debug("==4230==g_propData is undefined ==>itemId: " + tempItemIds[i]);
                    continue;
                }
                arr.push({id: tempItemIds[i] * 1, type: g_propData.exchange_type *1, num: tempItemNums[i] * 1});
            }
        }
        if(arr.length > 0) {
            user.fillBag(arr);
        }
        gudieNum += 1;
        user.setValue("guideStep",gudieNum);
        user.writeToDb(function () { });
        next(null, NID.NI_SC_GUIDE_STEP, {code: 0});
        return ;
    }
    else{
        next(1, NID.NI_SC_GUIDE_STEP, {code: 5});
        return ;
    }
})
