/**
 * 定时领奖领取
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var COMM = require("../../../common/commons");
//var tblTimeAward = require('../../../Resources/TimeAward');
var tblTimeAward = require('../../../Resources/reward');

handlerMgr.handler(NID.NI_CS_TIME_AWARD,function(packetId, param, next){
    var user = param.user();
    var vipLv = user.getValue("vipLv")*1;
    var result = {is:false, num:0};
    if(!user){
        next(1,NID.NI_SC_TIME_AWARD, result);
        return;
    }
    var data = param.data;
    if(data == undefined || data == null){
        result.err = 2;
        next(1, NID.NI_SC_TIME_AWARD, result);
        return;
    }
    var timeZone = data.timeZone*1;
    if(timeZone == undefined){
        result.err = 3;
        next(1, NID.NI_SC_TIME_AWARD, result);
        return;
    }
    //console.log("-------------------802 timeZone",timeZone);
    var gold = user.getValue('gold')*1;
    //console.log("-------------------802 gold",gold);
    var gem = user.getValue('gem')*1;
    var curDate = new Date();
    var timeNow = curDate.getUTCHours() + timeZone +curDate.getUTCMinutes()/60+curDate.getUTCSeconds()/(60*60);
    var info = {
        awards1:user.getValue('awards1') *1 ? true:false,
        awards2:user.getValue('awards2') *1 ? true:false,
        awards3:user.getValue('awards3') *1 ? true:false,
        time: user.getValue('awardsTime')};

    var process = function(key){
        var type  = user.getValue(key) *1;
        if(!type){
            info[key] = true;

            result.is = info[key];
            result.num = getAwardId(timeNow) *1 +1;

            user.setValue("awards1", (info["awards1"] ? 1:0));
            user.setValue("awards2", (info["awards2"] ? 1:0));
            user.setValue("awards3", (info["awards3"] ? 1:0));
            user.setValue("awardsTime",info.time);
            //user.acceptGold(getAward(curDate.getHours(),vipLv));
            var idx = getAwardId(timeNow);
            if(idx != -1){
                console.log("-------------------vipLv",vipLv);
                if(tblTimeAward[idx].item_id*1 == 1002){
                    gold += tblTimeAward[idx].reward_num*1;
                    user.setValue("gold",gold);
                }
                else if(tblTimeAward[idx].item_id*1 == 1003){
                    gem += tblTimeAward[idx].reward_num*1;
                    user.setValue("gem",gem);
                }else {
                    user.fillBag([{id: tblTimeAward[idx].item_id, type: global.prop[tblTimeAward[idx].item_id].exchange_type*1, num: tblTimeAward[idx].reward_num}]);
                }
                user.writeToDb();
                console.log("802  user.getValue('gold'): ", user.getValue('gold'));
            }


        }

    }

    var idx = getAwardId(timeNow);
    if(idx != -1){
        process("awards"+(idx+1));
    }
    console.log("-------------------result",result);
    next(null,NID.NI_SC_TIME_AWARD, result);
});
var getAwardId = function(hour){
    console.log("-------------------802 hour",hour);
    for(var k  in tblTimeAward){
        var obj = tblTimeAward[k];
        if(hour >= obj["reward_stime"]*1 &&
            hour <= obj["reward_etime"]*1){
            return k*1;
        }
    }

    return -1;
}
var getAward = function(hour,vipLv,gold,gem){
    var idx = getAwardId(hour);
    if(idx != -1){
        console.log("-------------------vipLv",vipLv);
        if(tblTimeAward[idx].item_id*1 == 1002){
            gold += tblTimeAward[idx].reward_num*1;
        }
        if(tblTimeAward[idx].item_id*1 == 1003){
            gem += tblTimeAward[idx].reward_num*1;
        }
        //return tblTimeAward[idx].reward_num*(vipLv+1);

        //return tblTimeAward[idx].gold
    }

    return 0;
}
