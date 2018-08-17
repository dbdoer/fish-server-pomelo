/**
 * 获取好友申请列表
 */
var handlerMgr = require("./../handlerMgr");
var friendReqDao = require('../../../dao/friendReqDao');
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_GET_FRIEND_REQUESTLIST,function(packetId, param, next){
    var resultInfo = {err: 0, requestList:[]}
    var user = param.user();
    if(!user){
        resultInfo.err = 1;
        next(1, NID.NI_SC_GET_FRIEND_REQUESTLIST, resultInfo);
        return;
    }

    //console.log("==>277 NI_SC_GET_FRIEND_REQUESTLIST <====");
    var friendReqList = user.contMng.friendReq;
    if(friendReqList != undefined && friendReqList.m_Array.length > 0){
        var info = [];
        /// 申请记录条数上限99,超过则删除最前的记录
        if(friendReqList.m_Array.length >= 99){
            var delNum = friendReqList.m_Array.length - 99;
            friendReqList.m_Array.splice(0,delNum);
        }
        for (var key = 0; key < friendReqList.m_Array.length; key++) {
            info.push(friendReqList.m_Array[key].data);
        }

        resultInfo.requestList = info;
        //console.log("=11=>277 NI_SC_GET_FRIEND_REQUESTLIST==> resultInfo: ");
        next(null, NID.NI_SC_GET_FRIEND_REQUESTLIST, resultInfo);
    }
    else {
        friendReqDao.load(user, function (err, res) {
            var friendReqList = user.contMng.friendReq;
            if (err || friendReqList == undefined) {
                resultInfo.err = 2;
                next(1, NID.NI_SC_GET_FRIEND_REQUESTLIST, resultInfo);
                return;
            } else {
                var info = [];
                /// 申请记录条数上限99,超过则删除最前的记录
                if(friendReqList.m_Array.length >= 99){
                    var delNum = friendReqList.m_Array.length - 99;
                    friendReqList.m_Array.splice(0,delNum);
                }
                for (var key = 0; key < friendReqList.m_Array.length; key++) {
                    info.push(friendReqList.m_Array[key].data);
                }

                //console.log("=22=>277 NI_SC_GET_FRIEND_REQUESTLIST==> resultInfo: ");
                resultInfo.requestList = info;
                console.log("==>277 NI_SC_GET_FRIEND_REQUESTLIST <==== resultInfo",resultInfo);
                next(null, NID.NI_SC_GET_FRIEND_REQUESTLIST, resultInfo);
            }
        })
    }
})
