/**
 * 解锁皮肤
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_CHANGE_SKIN,function(packetId, param, next){
    var user = param.user();
    var data = param.data; ///skinID, actType = 0:主界面 1: 战斗界面
    var result = {err : 0};
    //console.log('===228==NI_CS_CHANGE_SKIN====>data: ', data);
    if(!user || data == undefined || data.skinID == undefined || data.actType == undefined){
        result.err = 1;
        next(1, NID.NI_SC_CHANGE_SKIN, result);
        return;
    }
    /// 判断skinID是否存在
    var skins = user.getValue('unlockSkins');
    skins = JSON.parse(skins);
    if(skins[data.skinID] == undefined){
        result.err = 2;
        next(1, NID.NI_SC_CHANGE_SKIN, result);
        return;
    }

    /// 判断skinID是否是当前的
    var curSkinId = user.getValue('curSkinId');
    if(curSkinId == data.skinID){
        result.err = 3;
        next(1, NID.NI_SC_CHANGE_SKIN, result);
        return;
    }
    if(data.actType <= 0){ ///从主界面进商场购买后调用
        user.setValue('curSkinId', data.skinID);
        user.writeToDb(function(){});
        next(null, NID.NI_SC_CHANGE_SKIN, result);
    }else {
        user.rpcTrans('changeSkin', [data.skinID], function (err) {
            if (err) {
                result.err = 4;
                next(1, NID.NI_SC_CHANGE_SKIN, result);
                return;
            }

            user.setValue('curSkinId', data.skinID);
            user.writeToDb(function(){});
            next(null, NID.NI_SC_CHANGE_SKIN, result);
        });
    }

})
