/**
 * 破产补助发放
 */
var handlerMgr = require("./../handlerMgr");
var COMM = require("../../../common/commons");
var Subsidy = require("../../../Resources/Subsidy");

var NID = handlerMgr.NET_ID;
var SUBSIDY_MAX_NUM_DAY = 3;  //每日最多补助次数

//msg id 804
handlerMgr.handler(NID.NI_CS_SUBSIDY_REWARD,function(packetId, param, next){
    console.log("----------804 ------------------------------- ");
    var result = {errCode: 0, isGetSubsidy: 0, stateNum: 0};
    var user = param.user();
    if(user == undefined){
        result.errCode = 1;
        next(1, NID.NI_SC_SUBSIDY_REWARD, result);
        return;
    }
    var viplevel = user.getValue("vipLv");
    var gold = user.getValue('gold')*1;
    var subsidyNum = user.getValue('subsidyNum');
    var subsidyStartTime = user.getValue('subsidyStartTime');
    var latelySubsidyTime = user.getValue('latelySubsidyTime');

    var curDateTime = new Date();
    var latelySubsidyDate = new Date( latelySubsidyTime * 1000);

    /// 是否是新的一天
    if(!COMM.isSameDate(latelySubsidyDate,curDateTime)){
        user.setValue('subsidyNum', 0);
        subsidyNum = 0;
    }

    /// 判断补助次数
    var rewSubsidy = Subsidy[subsidyNum*1+1 + ''];
    //console.log("222225555555+++++++++rewSubsidy==>: ",rewSubsidy);
    do{
        if(subsidyNum >= SUBSIDY_MAX_NUM_DAY){
            result.errCode = 3;
            break;
        }
        //一天最大的补助次数超限
        /*if (viplevel < 5) {
            if(subsidyNum >= SUBSIDY_MAX_NUM_DAY){
                result.errCode = 3;
                break;
            }
        }
        if (viplevel > 5) {
            if(subsidyNum >= SUBSIDY_MAX_NUM_DAY+2){
                result.errCode = 3;
                break;
            }
        }*/

        if(rewSubsidy == undefined){
            result.errCode = 1;
            break;
        }
        var curTime = Date.now();
        /// 判断倒计时时间
        if(subsidyStartTime <= 0 && (subsidyStartTime + rewSubsidy.waiting_time) * 1000 < curTime){
            result.errCode = 2;
            break;
        }

        if(viplevel >= 4){
            //user.acceptGold(2*rewSubsidy.gold *1);
            gold += 2*rewSubsidy.gold *1;
            user.rpcTrans('subsidyReward', [gold], function (err, ret) {
            });
        }else {
            //user.acceptGold(rewSubsidy.gold *1);  /// 加入奖励
            gold += rewSubsidy.gold *1;
            user.rpcTrans('subsidyReward', [gold], function (err, ret) {
            });
        }
        

        subsidyNum += 1;  /// 补助次数 +1
        subsidyStartTime = 0;  /// 领奖后清零

        result.isGetSubsidy = 1;
        result.stateNum = subsidyNum;

        user.setValue('gold',gold);
        user.setValue('subsidyNum',subsidyNum);
        user.setValue('subsidyStartTime',subsidyStartTime);
        user.setValue('latelySubsidyTime',latelySubsidyTime);
        //写档操作
        user.writeToDb(function(){});

        //user.loadFromDb(function(){});
    }while (0);
    next(null, NID.NI_SC_SUBSIDY_REWARD, result);
})



/**
 *  发放破产补助
Player.prototype.subsidyReward = function (cb) {
    var self = this;
    /// 判断补助次数
    console.log("22222+++++++++subsidyNum==>: ",self.subsidyNum);
    var rewSubsidy = global.subsidy[self.subsidyNum*1 +1];
    console.log("22222+++++++++rewSubsidy==>: ",rewSubsidy);
    if(rewSubsidy == undefined){
        cb(1);return;
    }
    var curTime = Date.now();
    /// 判断倒计时时间
    console.log("22222+++++++++curTime==>: ",curTime);
    console.log("22222+++++++++self.subsidyStartTime + rewSubsidy.waiting_time) * 1000==>: ",(self.subsidyStartTime + rewSubsidy.waiting_time) * 1000);
    if(self.subsidyStartTime <= 0 && (self.subsidyStartTime + rewSubsidy.waiting_time) * 1000 < curTime){
        cb(2);return;
    }

    self.earn(RES_TYPE_GOLD, rewSubsidy.gold *1);  /// 加入奖励
    console.log("+++++++++gold1==>: ",this.gold*1);
    console.log("+++++++++gold2==>: ",rewSubsidy.gold *1);
    self.msgDispatcher.saveGoldToRedis(self.uid, self.gold, function(){});

    self.subsidyNum += 1;  /// 补助次数 +1
    self.subsidyStartTime = 0;  /// 领奖后清零
    self.save();  ///保存破产数据
    cb(null, {subsidyNum: self.subsidyNum});
}
 * */
