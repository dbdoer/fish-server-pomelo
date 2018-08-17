var activityMgr = require("../../modules/activityMng");
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;


handlerMgr.handler(NID.NI_CS_SPECIAL_EXPLOSION,function(packetId, param, next){
    //console.log("------------------------207");
    var user = param.user();
    var data = param.data;

    //console.log('=236===NI_CS_SPECIAL_EXPLOSION=>data: ', data);
    if(user == undefined || user == null || data == undefined){
        console.log("===207 NI_CS_FIRE ===>user || data == undefined");
        return;
    }

    user.rpcTrans('specialExplosion', [data], function (err, ret) {
        if(err || ret == null || ret == undefined){
            return;
        }

        if(ret.gold != undefined && ret.gold > 0){
            user.acceptGold(ret.gold);
            activityMgr.recvGold(user, ret.gold);
        }
        /// 玩家等级升级的奖励  ----start----
        if(ret.levelReward != undefined){
            //// 如果是金币则不要再加,Player文件中已经添加过
            if(ret.levelReward.type*1 == 2){ /// 钻石
                user.acceptGem(ret.levelReward.number*1 || 0);
            }else if (ret.levelReward.type*1 == 3){ /// 金条
                if(global.prop[1001] != undefined) {
                    user.fillBag([{id: 1001, type: global.prop[1001].exchange_type, num: ret.levelReward.number * 1 || 0}]);
                }
            }
        }
        /// 玩家等级升级的奖励  ----end----
        if(ret.score){
            user.acceptScore(ret.score);
        }
        /// 新手引导不会掉物品 *2016/12/20 xiahou*
        /*if(ret.list != undefined && Object.keys(ret.list).length > 0){
            for(var lKey in ret.list){
                var propInfo = ret.list[lKey];
                if(propInfo.gemNum !== undefined){
                    user.acceptGem(propInfo.gemNum *1);
                }
                if(propInfo.propList !== undefined){
                    user.fillBag(propInfo.propList);
                }
            }
        }*/
    });
})
