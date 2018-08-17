/**
 * 碰撞
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var roomManager = global.roomManager;
var activityMgr = require("../../modules/activityMng");
handlerMgr.handler(NID.NI_CS_EXPLOSION,function(packetId, param, next){

    var user = param.user();
    if(!user){
        console.log('--209---NI_CS_EXPLOSION ==>user == undefined ');
        return;
    }
    if(param.data == undefined){
        console.log('--209---NI_CS_EXPLOSION ==>param.data == undefined ');
        return;
    }
    //console.log('--209---NI_CS_EXPLOSION--------==>param.data: ',param.data);
    if(global.g_GameBreaker[user.uid] != undefined && global.g_GameBreaker[user.uid] == true && param.data.isFullCapture != 1){
        //console.log("-------------------global.g_GameBreaker: ",global.g_GameBreaker);
        param.data.isFullCapture = 2;  ///捕获到炸弹isFullCapture为1;Debug功能设置isFullCapture为 2;
    }
    user.rpcTrans('explosion', [param.data], function (err, ret) {
        if(err){
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
        if(ret.curGuideStep != undefined){
            user.setValue('guideStep',ret.curGuideStep);
            user.writeToDb(function () { });
        }
        if(ret.list != undefined && Object.keys(ret.list).length > 0){
            for(var lKey in ret.list){
                var propInfo = ret.list[lKey];
                if(propInfo.gemNum !== undefined){
                    user.acceptGem(propInfo.gemNum *1);
                }
                if(propInfo.propList !== undefined){
                    user.fillBag(propInfo.propList);
                }
            }
        }

    })
});
