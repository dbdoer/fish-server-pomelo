/**
 * 离开房间
 */
var bagDao = require("../../../dao/bagDao");
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var roomManager = global.roomManager;

handlerMgr.handler(NID.NI_CS_LEAVE_ROOM,function(packetId, param, next) {

    var user = param.user();
    var data = param.data;

    if(user == undefined || data == undefined){
        next(1, NID.NI_SC_LEAVE_ROOM, {code: 1212});
        return;
    }
    var tempCode = 0;
    if (data.type * 1 == 11) {
        tempCode = 1;
    } else if (data.type * 1 == 12) {
        tempCode = 2;
    }

    //console.log('==4205===NI_CS_LEAVE_ROOM==>data: ',data);
    user.rpcTrans('leaveRoom', [], function (err,ret) {
        if (!!err || err != undefined || err != null) {
            next(null, NID.NI_SC_LEAVE_ROOM, {code: err});
            return;
        }
        if (ret == null || ret == undefined) {
            next(1, NID.NI_SC_LEAVE_ROOM, {code: 109});
            return;
        }
        if(ret.level != undefined && ret.experience != undefined) {
            user.setValue("level", ret.level);
            user.setValue("experience", ret.experience);
            user.writeToDb(function () { });
        }
        user.setRoomServerId(null);

        //console.log('==4205===NI_CS_LEAVE_ROOM==>err: ',err);
        ///***** 快速赛退出房间的逻辑处理 ****START******
        if(data.type *1 == 11 && ret.isMatchStart != undefined){
            if(ret.isMatchStart == false){
                //只有未开始退出房间后需要返回报名费(金币\报名劵)
                var compConfigInfo = global.compConfig[ret.matchType];
                if(compConfigInfo != undefined) {
                    if(ret.costType *1 == 2){
                        var propNum = compConfigInfo.prop_num *1;
                        var _obj = user.contMng.bag.getRealbyGuid(compConfigInfo.prop_id);
                        _obj.data.propNum = _obj.data.propNum *1 + propNum;
                        bagDao.write(user, function(){});
                    }
                    else if(ret.costType *1 == 1){
                        var signUpCost = compConfigInfo.competition_cost * 1;
                        var gold = user.getValue("gold") * 1;
                        gold += signUpCost || 0;
                        user.setValue("gold", gold);
                        user.writeToDb(function () { });
                    }
                    //console.log('==4205===NI_CS_LEAVE_ROOM==>ret.costType : ',ret.costType );
                }
            }
        }
        ///***** 快速赛退出房间的逻辑处理 ****END******
        next(null, NID.NI_SC_LEAVE_ROOM, {code: tempCode});
    });
});
