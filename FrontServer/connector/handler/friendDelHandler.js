/**
 * 删除好友
 */
var handlerMgr = require("./../handlerMgr");
var friendDao = require("../../../dao/friendDao");
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_DEL_FRIEND,function(packetId, param, next){
    var resultInfo = {err: 0};
    var user = param.user();
    var data = param.data;  ///uid 要删除的好友Uid

    //console.log('==283 NI_CS_DEL_FRIEND ==>data: ',data);
    if(user == undefined || data == undefined || param.session == undefined){
        resultInfo.err = 1;
        next(1, NID.NI_SC_DEL_FRIEND, resultInfo);
        return;
    }
    if(user.uid == data.uid){  ///不能删除自己
        resultInfo.err = 2;
        next(1, NID.NI_SC_DEL_FRIEND, resultInfo);
        return;
    }
    var friends = user.contMng.friends;
    if(friends == undefined || friends.m_Array.length <= 0){
        resultInfo.err = 3;
        next(1, NID.NI_SC_DEL_FRIEND, resultInfo);
        return;
    }

    var delIndex = -1;
    for (var key = 0; key < friends.m_Array.length; key++) {
        if( friends.m_Array[key].data != undefined &&
            friends.m_Array[key].data.guid == data.uid){
            delIndex = key;
            break;
        }
    }
    //console.log('==283 NI_CS_DEL_FRIEND ==> delIndex: ', delIndex);
    //小于0表没有要删除的好友
    if(delIndex < 0 || delIndex > friends.m_Array.length){
        resultInfo.err = 4;
        next(1, NID.NI_SC_DEL_FRIEND, resultInfo);
        return;
    }else{
        var tempFriend = friends.m_Array[delIndex];
        //console.log('==friends.delFromDb==>user.uid, uid: ',user.uid, data.uid)
        tempFriend.delFromDb(user.uid, data.uid, function(err, result){
            //console.log('==friends.delFromDb==>err, result: ',err,result)
            if(err || result <= 0){
                resultInfo.err = 5;
                next(1, NID.NI_SC_DEL_FRIEND, resultInfo);
                return;
            }
            /// 把好友从自己的列表中删除
            friends.m_Array.splice(delIndex, 1);
            /// 把自己从好友的列表中删除
            var session = param.session;
            var otherUser = session.getUser(data.uid);
            if(otherUser != undefined && otherUser.contMng.friends != undefined){
                var otherFriends = otherUser.contMng.friends;
                for (var oKey = 0; oKey < otherFriends.m_Array.length; oKey++) {
                    if( otherFriends.m_Array[oKey].data != undefined &&
                        otherFriends.m_Array[oKey].data.guid == user.uid){
                        otherFriends.m_Array.splice(oKey, 1);
                        break;
                    }
                }
            }
            tempFriend.delFromDb(data.uid, user.uid, function(err, resInfo){
                if(err || resInfo <= 0){
                    resultInfo.err = 5;
                    next(1, NID.NI_SC_DEL_FRIEND, resultInfo);
                    return;
                }
                console.log('==283 NI_CS_DEL_FRIEND ==> resultInfo: ');
                next(null, NID.NI_SC_DEL_FRIEND, resultInfo);
            })
        })
    }
})
