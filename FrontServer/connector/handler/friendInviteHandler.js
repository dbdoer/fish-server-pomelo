/**
 * 邀请好友
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_FRIEND_INVITE,function(packetId, param, next){
    var resultInfo = {err: 0};

    var user = param.user();
    var session = param.session;
    var data = param.data;  /// uid
    console.log('===285 NI_CS_FRIEND_INVITE==>data: ',data);
    if(!user || session == undefined || data == undefined || data.uid == undefined){
        resultInfo.err = 1;
        next(1, NID.NI_SC_FRIEND_INVITE, resultInfo);
        return;
    }
    var friends = user.contMng.friends;
    if(friends == undefined || friends.m_Array.length <= 0){
        resultInfo.err = 2;
        next(1, NID.NI_SC_FRIEND_INVITE, resultInfo);
        return;
    }
    /// 查找自己是否在经典模式下的房间内
    var rpc = session.getRpcManager().getRpcByRType('RoomServer');
    if (rpc == undefined || rpc == null) {
        resultInfo.err = 3;
        next(1, NID.NI_SC_FRIEND_INVITE, resultInfo);
        return;
    }
    var method = rpc.getMethod('msgPacketTrans');
    //console.log('****************************method',method);
    if (method == undefined || method == null) {
        resultInfo.err = 3;
        next(1, NID.NI_SC_FRIEND_INVITE, resultInfo);
        return;
    }
    method('getMatchRoomInfo', user.uid, [], function (err, matchType, roomId){
        //console.log('===getMatchRoomInfo==>matchType, roomId: ',err,matchType, roomId);
        if (err || matchType == undefined || roomId == undefined) {
            resultInfo.err = 4;
            next(1, NID.NI_SC_FRIEND_INVITE, resultInfo);
            return;
        }
        var isExist = false;
        for (var i = 0; i < friends.m_Array.length; i++) {
            var tempFri = friends.m_Array[i].data;
            if (tempFri.guid == data.uid) {
                isExist = true;
                break;
            }
        }
        if (!isExist) {
            resultInfo.err = 5;
            next(1, NID.NI_SC_FRIEND_INVITE, resultInfo);
            return;
        }
        var tempUser = session.getUser(data.uid);
        if (tempUser != undefined) {
            console.log('===NI_SC_INVITE_FRIEND==>matchType,roomId: ',matchType, roomId,user.uid);
            tempUser.sendMsg(NID.NI_SC_INVITE_FRIEND, {matchType: matchType, roomId: roomId, uid: user.uid});
        }
        console.log('=111==NI_CS_FRIEND_INVITE==>resultInfo: ',resultInfo);

        next(null, NID.NI_SC_FRIEND_INVITE, resultInfo);
    });
})
