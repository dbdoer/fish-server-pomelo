/**
 * 进入房间
 */
var handlerMgr = require("./../handlerMgr");
var logger = require("../../../common/logHelper").helper;
var NID = handlerMgr.NET_ID;
var roomManager = global.roomManager;

handlerMgr.handler(NID.NI_CS_ENTER_ROOM,function(packetId, param, next) {

    var user = param.user();
    var data = param.data; /// matchType: 房间ID, roomId: 配置表里的比赛ID

    if (user == undefined || data == undefined) {
        next(1, NID.NI_SC_ENTER_ROOM, {err: 1});
        return;
    }
    console.log('handle NI_CS_ENTER_ROOM: entered. room info: ' +JSON.stringify(data));

    if (data.matchType == undefined) {
        data.matchType = null;
    }

    if ((data.roomId*1) <= 0) {
        logger.err('handle NI_CS_ENTER_ROOM: invalid roomId.');
        next(1, NID.NI_SC_ENTER_ROOM, {err: 2});
        return;
    }

    var vipLv = user.getValue("vipLv")*1;
    if(data.roomId == 1112004) {
        if(vipLv < 5){
            next(1, NID.NI_SC_ENTER_ROOM, {err: 1003});
            return;
        }
    }

    roomManager.allocateRoom(parseInt(data.roomId), data.matchType, user, function (err, data) {
        //storeRoomServer(sid, uid, data.roomServerId, {type: 10});
        if (err || err != undefined || data == undefined) {
            logger.err('handle NI_CS_ENTER_ROOM: allocateRoom error: '+ err);
            next(1, NID.NI_SC_ENTER_ROOM, {err: err});
            return;
        }

        //此行代码重复
        //user.setRoomServerId(data.roomServerId);

        data.err = 0;
        console.log('handle NI_CS_ENTER_ROOM: send room info to client: ' /*+JSON.stringify(data)*/);
        next(null, NID.NI_SC_ENTER_ROOM, data);
    });
})


