var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;


handlerMgr.handler(NID.NI_CS_SPECIAL_WEAPON_FIRE,function(packetId, param, next){
    //console.log("------------------------207");
    var user = param.user();
    var data = param.data;
    console.log('=4235===NI_CS_SPECIAL_WEAPON_FIRE=>data: ', data)
    if(user == undefined || user == null || data == undefined){
        next(1,  NID.NI_SC_SPECIAL_WEAPON_FIRE, {errCode: 1});
        return;
    }

    user.rpcTrans('specialFire', [data.weaponType, data.fireX, data.fireY], function (err, ret) {
        console.log("===235 NI_CS_SPECIAL_WEAPON_FIRE ===>err= %s",err);
        if (!!err || !ret ) {
            next(1,  NID.NI_SC_SPECIAL_WEAPON_FIRE, {errCode: 2});
            return;
        }

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

        next(null,  NID.NI_SC_SPECIAL_WEAPON_FIRE, {errCode: 0});
    });
})
