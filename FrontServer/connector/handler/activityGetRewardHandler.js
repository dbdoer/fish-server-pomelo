/**
 * 获取活动奖励
 */
var handlerMgr = require("./../handlerMgr");
var activityMgr = require("../../modules/activityMng");
var NID = handlerMgr.NET_ID;
handlerMgr.handler(NID.NI_CS_ACTIVITY_REWARD,function(packetId, param, next){
    console.log("-------------------------420");
    var reward = {err:0,rewardlist:[]};
    var user = param.user();
    if(user == undefined){
        reward.err = 1;
        next(null, NID.NI_SC_ACTIVITY_REWARD, reward);
        return;
    }
    var data = param.data;
    if(data == undefined){
        reward.err = 2;
        next(null, NID.NI_SC_ACTIVITY_REWARD, reward);
        return;
    }
    console.log("-------------------------420data",data);
    var aid = 0;
    if(data.aid){
        aid = data.aid;
    }

    var info = activityMgr.getAward(user, aid);
    if(info == false||info ==undefined){
        reward.err = 3;
        next(null, NID.NI_SC_ACTIVITY_REWARD, reward);
        return;
    }
    var arr = [];
    var t_gold = user.getValue("gold") *1;
    var t_gem = user.getValue("gem") *1;
    var propInfo = JSON.parse(info.tool_info);
    var rewardInfo = [];
    console.log("-----------propInfo",propInfo);
    console.log("-----------typeof propInfo",typeof(propInfo));
    for(var i = 0; i< propInfo.length; i++){
        console.log("-----------propInfo[i]111111",propInfo[i]);
        if(propInfo[i] == undefined){ continue; }
        var g_prop = global.prop[propInfo[i].goodId];
        if(g_prop == undefined){ continue; }
        console.log("-----------g_prop",g_prop);
        if(propInfo[i].goodId *1 == 1002){
            console.log("-----------propInfo[i]",propInfo[i]);
            t_gold += propInfo[i].goodNum*1 || 0;
        }
        else if(propInfo[i].goodId *1 == 1003){
            t_gem += propInfo[i].goodNum*1 || 0;
        }

        else {
            console.log("-----------propInfo[i]",propInfo[i]);
            arr.push({id: propInfo[i].goodId, type: g_prop.exchange_type, num: propInfo[i].goodNum});
        }
        rewardInfo.push({propID:propInfo[i].goodId,propNum:propInfo[i].goodNum});
    }
    user.fillBag(arr);
    user.setValue("gold", t_gold);
    user.setValue("gem",t_gem);
    /*reward =  {err:0, rewardType:info['reward_type'], rewardNum:info['reward_number']};
     if(reward.rewardType == 1){
     user.acceptGold(reward.rewardNum);
     }else{
     user.acceptGem(reward.rewardNum);
     }*/
    console.log("-----------rewardInfo",rewardInfo);
    user.writeToDb();
    next(null, NID.NI_SC_ACTIVITY_REWARD, {err:0,rewardlist:rewardInfo});
    
})
