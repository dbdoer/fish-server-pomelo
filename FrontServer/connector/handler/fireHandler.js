/**
 * 开火
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var activityMgr = require("../../modules/activityMng");
var logger = require("../../../common/logHelper").helper;

handlerMgr.handler(NID.NI_CS_FIRE,function(packetId, param, next){
    //console.log("------------------------207");
    var user = param.user();
    var data = param.data;
    if (user == undefined || user == null || data == undefined) {
        logger.err("===207 NI_CS_FIRE ===>user || data == undefined");
        next(1, NID.NI_SC_FIRE, [data.clientid, 0, false]);
        return;
    }

    user.rpcTrans('fire', [data.fireX, data.fireY], function (err, ret) {
        if (err || !ret || !ret.num) {
            logger.err("===207 NI_CS_FIRE ===>err=%s, ret=%s", err, ret);
            next(1,  NID.NI_SC_FIRE, [data.clientid, 0, false]);
            return;
        }

        var fireCount = ret.num;
        user.spendGold(ret.cost);
        activityMgr.costGold(user, ret.cost);

        var rechargeCoefficient = ret.rechargeCoefficient;
        var costquotaPool = ret.costquotaPool;
        var noviceCoefficient = ret.noviceCoefficient;
        if(rechargeCoefficient != undefined) {
            user.setValue("rechargeCoefficient", rechargeCoefficient);
        }
        if(costquotaPool != undefined) {
            user.setValue("costquotaPool", costquotaPool);
        }
        if(noviceCoefficient != undefined) {
            user.setValue("noviceCoefficient", noviceCoefficient);
        }
        if(ret.cost>0 && !Math.floor(ret.num % 10)){
            user.writeToDb();
        }

        if (fireCount == undefined || fireCount == null) {
            fireCount = 0;
        }
        next(null,  NID.NI_SC_FIRE, [data.clientid, fireCount, true]);
    });
})
