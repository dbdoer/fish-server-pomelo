/**
 * 处理好友的邀请
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_FRIEND_INVITEDEAL,function(packetId, param, next){
    var resultInfo = {err: 0};

    var user = param.user();
    var session = param.session;
    var data = param.data;  /// result, matchType, roomId
    console.log('===287 NI_CS_FRIEND_INVITEDEAL==>data: ',data);
    if(!user || data == undefined || session == undefined){
        next(1, NID.NI_SC_FRIEND_INVITEDEAL, resultInfo);
        return;
    }
    if(data.result != undefined && data.result*1 > 0 && data.result*1 <= 1) { /// 同意邀请
        /// 查找赛事
        var rpc = session.getRpcManager().getRpcByRType('RoomServer');
        if (rpc == undefined || rpc == null) {
            resultInfo.err = 2;
            next(1, NID.NI_SC_FRIEND_INVITEDEAL, resultInfo);
            return;
        }
        var method = rpc.getMethod('getMatchOfRoom');
        if (method == undefined || method == null) {
            resultInfo.err = 3;
            next(1, NID.NI_SC_FRIEND_INVITEDEAL, resultInfo);
            return;
        }
        method(data.matchType, data.roomId, function (resInfo) {
            console.log('===getMatchOfRoom==>resInfo: ',resInfo);
            if (resInfo == null || resInfo.err > 0) {
                resultInfo.err = 4;
                if(resInfo.err == 1){
                    resultInfo.err = 5;
                }else if(resInfo.err == 2){
                    resultInfo.err = 6;
                }else if(resInfo.err == 3){
                    resultInfo.err = 7;
                }
                next(1, NID.NI_SC_FRIEND_INVITEDEAL, resultInfo);
                return;
            }

            next(null, NID.NI_SC_FRIEND_INVITEDEAL, resultInfo);
        });
    }else{
        resultInfo.err = 8;
        next(1, NID.NI_SC_FRIEND_INVITEDEAL, resultInfo);
        return;
    }
})
