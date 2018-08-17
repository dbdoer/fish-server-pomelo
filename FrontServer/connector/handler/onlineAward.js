/**
 * 在线奖励领取
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var onlineReward = require('../../../Resources/onlinereward');

handlerMgr.handler(NID.NI_CS_ONLINE_AWARD,function(packetId, param, next){
    console.log("------------------------711");
    var user = param.user();
    var data = param.data;
    if(user == undefined || user == null || data == undefined){
        console.log("===711 NI_CS_FIRE ===>user || data == undefined");
        next(1,  NID.NI_SC_ONLINE_AWARD, {err:1,time:0,idList:[]});
        return;
    }
    //console.log("------------------------711 data",data);
    var id = data.id;
    if(id == undefined){
        console.log("===711 NI_CS_FIRE ===>id == undefined");
        next(1,  NID.NI_SC_ONLINE_AWARD, {err:3,time:0,idList:[]});  //前端没有传数组过来
        return;
    }
    var now = Date.now();
    var totalTime = user.getValue('totalTimeOneDay')*1;
    var gold = user.getValue('gold')*1;
    var gem = user.getValue('gem')*1;
    var onlineRewardList = [];
    var _gold = 0;
    var _gem = 0;
    for(var k = 0; k < id.length; k++){
        for(var i in onlineReward){
            if(i*1 == id[k]*1){
                if(totalTime >= onlineReward[i].reward_time*60*1000){
                    user.setValue('onlineAwards'+ i ,1);
                    onlineRewardList.push(i);
                    if(onlineReward[i].item_id*1 == 1002){
                        gold += onlineReward[i].reward_num*1;
                        _gold += onlineReward[i].reward_num*1;
                    }
                    if(onlineReward[i].item_id*1 == 1003){
                        gem += onlineReward[i].reward_num*1;
                        _gem += onlineReward[i].reward_num*1;
                    }
                }
            }
        }
    }
    //console.log("------------------------711 onlineRewardList",onlineRewardList);
    if(onlineRewardList.length == 0){
        next(1,  NID.NI_SC_ONLINE_AWARD, {err:2,time:0,idList:[]});
        return;
    }
    if(user.roomServerId != undefined && user.roomServerId != null){
        user.rpcTrans('purchase', [_gold,_gem, undefined, undefined], function (err, ret) {
        });
    }
    user.setValue("gold",gold);
    user.setValue("gem",gem);
    user.writeToDb();
    //console.log("------------------------711 onlineRewardList",onlineRewardList);
    next(null,  NID.NI_SC_ONLINE_AWARD, {err:0,time:totalTime,idList:onlineRewardList});
})
