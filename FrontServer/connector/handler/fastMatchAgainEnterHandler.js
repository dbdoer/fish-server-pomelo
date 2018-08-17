/**
 * 重新进入快速赛
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var logger = require("../../../common/logHelper").helper;
/**
 * code = 0:表示不在比赛ing , 1:表示在比赛ing ,其余都是错误值
 */
handlerMgr.handler(NID.NI_CS_AGAIN_ENTER_MATCH,function(packetId, param, next){
    
    var session = param.session;
    var user = param.user();
    if(!user || session == undefined){
        next(1, NID.NI_SC_AGAIN_ENTER_MATCH, {code: 2});
        return;
    }
    var rpcQ = session.getRpcManager().getRpcByRType('MatchQueueServer');
    if (!rpcQ) {
        next(1, NID.NI_SC_AGAIN_ENTER_MATCH, {code: 3});
        return;
    }
    var method = rpcQ.getMethod('againEnterMatch');
    if (!method) {
        next(1, NID.NI_SC_AGAIN_ENTER_MATCH, {code: 4});
        return;
    }
   
     //fastMatch 返回接口   MatchManager.prototype.getInspectionMatch
    method(user.getUid(), global.serverId, function (info) {
        if(info == undefined || info == null){
            logger.debug("===againEnterMatch before ==>code: 0");
            next(null, NID.NI_SC_AGAIN_ENTER_MATCH, {code: 0});
            return;
        }
        user.setRoomServerId(info.matchServerId);

        logger.debug("===againEnterMatch before ==> matchServerId =" + info.matchServerId);
        next(null, NID.NI_SC_AGAIN_ENTER_MATCH, {
            time: info.time,
            pathinfo: info.pathinfo,
            tracktime: info.tracktime,
            deadfishs: info.deadfishs,
            userList: info.userList,
            taskFishReward: info.taskFishReward,
            targetTaskFishNum: info.targetTaskFishNum,
            taskFishType: info.taskFishType,
            showTop: info.showTop,
            curFishFarmId: info.curFishFarmId,
            explosionQiLin: info.explosionQiLin,
            code: 1
        });
    });

})
