/**
 * 处理好友申请 1 同意 2 拒绝 3 全部同意 4 全部拒绝
 */
var async = require('async');
var handlerMgr = require("./../handlerMgr");
var ObjFriend = require("../../../obj/objFriend");
var userDao = require("../../../dao/userDao");
var friendDao = require("../../../dao/friendDao");
var friendReqDao = require("../../../dao/friendReqDao");
var NID = handlerMgr.NET_ID;

var addFriend = function(reply, user){
    if(reply == undefined || user == undefined){
        return null;
    }
    /// 对方信息加入到自己的好友列表
    //自己好友信息
    var tempFriend = new ObjFriend();
    tempFriend.setValue("guid", reply.uid);
    tempFriend.setValue("name", reply.nickname);
    tempFriend.setValue("sex", reply.sex|| 0);
    tempFriend.setValue("level", reply.level || 1);
    tempFriend.setValue("headurl", reply.headImage);
    tempFriend.setValue("vipLv", reply.vipLv || 0);
    tempFriend.setValue("gold", reply.gold);
    tempFriend.setValue("glory", reply.glory || 0);
    tempFriend.setValue("experience", reply.experience || 0);

    /// 自己信息加入到对方的好友列表
    //自己的信息
    var selfFriend = {};
    selfFriend.guid  = user.uid;
    selfFriend.name = user.data.nickname;
    selfFriend.sex = user.data.sex || 0;
    selfFriend.level = user.data.level || 1;
    selfFriend.headurl = user.data.headImage;
    selfFriend.vipLv = user.data.vipLv || 0;
    selfFriend.gold = user.data.gold || 0;
    selfFriend.glory = user.data.glory || 0;
    selfFriend.experience = user.data.experience || 0;
    selfFriend.state = 1;  /// 操作同意申请就说明玩家是在线

    return {self:tempFriend, other: selfFriend};
}

handlerMgr.handler(NID.NI_CS_FRIEND_REQUESTDEAL,function(packetId, param, next){
    var resultInfo = {err: 0, reqDealList :[]};
    var user = param.user();//玩家自己的数据
    var data = param.data;  ///type, uid   uid为好友的id
    //console.log('******************************param',param);
    //console.log('==278 NI_CS_FRIEND_REQUESTDEAL ==>data: ',data);
    if(user == undefined || param.session == undefined || data == undefined || data.type == undefined){
        resultInfo.err = 1;
        next(1, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
        return;
    }
    var friendReq = user.contMng.friendReq;//好友请求信息，相当于请求列表数据
    var friends = user.contMng.friends;//已加好友数据信息
    //console.log('***************************friendReq',friendReq);
    //console.log('***************************friends',friends);
    if(friendReq == undefined || friendReq.m_Array.length <= 0 || friends == undefined){
        resultInfo.err = 2;
        next(1, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
        return;
    }
    if(data.type *1 > 0 && data.type*1 <= 2){//// 单个同意或拒绝
        if(data.uid == undefined){
            resultInfo.err = 1;
            next(1, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
            return;
        }
        //// 查找是否在申请记录中存在 >=0表存在
        var reqIndex = getSelfInRequestListByUid(data.uid, friendReq.m_Array);
        //console.log('******************************reqIndex',reqIndex);//0
        if(reqIndex < 0 || reqIndex >= friendReq.m_Array.length){
            resultInfo.err = 4;
            next(1, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
            return;
        }

        if(data.type*1 == 1) { ///同意加为好友
            var friIndex = -1;
            //// 查找是否已经是好友,是好友就不显示在申请里
            for (var key = 0; key < friends.m_Array.length; key++) {
                if (friends.m_Array[key].data != undefined &&
                    friends.m_Array[key].data.guid == data.uid) {
                    friIndex = key;
                    break;
                }
            }
            //console.log('******************************friIndex',friIndex)//-1
            //console.log('=friends.m_Array===>friIndex: ',friIndex, friends);
            //大于或等于0表示是自己好友，报错
            if (friIndex >= 0 || friIndex > friends.m_Array.length) {
                resultInfo.err = 5;
                next(1, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
                return;
            }
            //检查玩家是否存在redis
            userDao.loadByGuid(friendReq.m_Array[reqIndex].data.guid, function (err, reply) {
                //console.log('=userDao.loadByGuid===>err, reply: ',err, reply);
                if (err || reply == null) {
                    resultInfo.err = 6;
                    next(1, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
                    return;
                }

                var result = addFriend(reply, user);
                //console.log('*********************result',result);
                if (result == null) {
                    resultInfo.err = 7;
                    next(1, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
                    return;
                }
                //console.log('*******************************reply',reply);
                //// TODO: 先直接查库,待添加了内存数据后再改成内存中没有则查库 (xiahou 8/18)
                //查看添加的好友的好友数据
                friendDao.loadByGuid(reply.uid, function(err, resInfo) {
                    if(err){
                        resultInfo.err = 6;
                        next(1, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
                        return;
                    }
                    if(resInfo == undefined || resInfo == null) {
                        resInfo = {};
                    }

                    var session = param.session;
                    var otherUser = session.getUser(reply.uid);
                    //// 判断对方是否在线
                    if(otherUser != undefined) {
                        result.self.data.state = 1;
                        otherUser.sendMsg(4288, {result:1, uid: user.uid});
                        var t_index = getSelfInRequestListByUid(user.uid, otherUser.contMng.friendReq.m_Array)
                        //删除好友的好友申请记录
                        if(t_index >= 0 && t_index < otherUser.contMng.friendReq.m_Array.length)
                            otherUser.contMng.friendReq.m_Array.splice(t_index, 1);
                        /// 查找对方申请列表中是否有自己,有则删除redis
                        friendReqDao.deleteByGuid(otherUser, user.uid, function(){ });
                    }
                    //将我的好友数据存到内存
                    friends.add(result.self);
                    resultInfo.reqDealList.push(result.self.data);
                    //// 同意后,申请记录要清除
                    friendReq.m_Array.splice(reqIndex, 1);
                    //以自己的id为键值，将好友数据(guid:data)存到我的好友里
                    friendDao.write(user, function(){ });
                    //重新组织redis数据
                    resInfo[result.other.guid] = result.other;
                    //以好友的id为键值，把自己数据存到好友的好友数据里
                    friendDao.writeByGuid(reply.uid, resInfo, function(){ });
                    //删除redis我的好友申请记录
                    friendReqDao.deleteByGuid(user, data.uid, function(){ });
                    //console.log('********************************result',result);
                    //console.log('******************************resInfo',resInfo);
                    //console.log('=11=278 NI_SC_FRIEND_REQUESTDEAL===>resultInfo: ');
                    next(null, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
                });
            })
        }
        else {
            //// 拒绝后,申请记录要清除
            friendReq.m_Array.splice(reqIndex, 1);
            friendReqDao.deleteByGuid(user, data.uid, function(){ });
            next(null, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
        }
    }
    else if(data.type *1 > 2 && data.type*1 <= 4){//// 全部同意或拒绝
        if(data.type*1 == 3) { ///全部同意加为好友
            var agreeAddFriend = [];
            for (var key = 0; key < friendReq.m_Array.length; key++) {
                var tempReqData = friendReq.m_Array[key].data;
                if (tempReqData == undefined){
                    continue;
                }
                //// 查找是否已经是好友
                var friIndex = -1;
                for (var fKkey = 0; fKkey < friends.m_Array.length; fKkey++) {
                    if (friends.m_Array[fKkey].data != undefined &&
                        friends.m_Array[fKkey].data.guid == tempReqData.guid) {
                        friIndex = fKkey;
                        break;
                    }
                }
                if (friIndex >= 0 || friIndex > friends.m_Array.length) {
                    resultInfo.err = 5;
                    next(1, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
                    return;
                }
                agreeAddFriend.push(tempReqData.guid);
            }

            //// TODO: 这个流程如果半路出错跳出后,会引起之前成功添加的记录没有被删除 (xiahou 8/18)
            var count = 0;
            async.whilst(
                function () {
                    return count < agreeAddFriend.length;
                },
                function (callBack) {
                    userDao.loadByGuid(agreeAddFriend[count], function (err, reply) {
                        if (err || reply == null) {
                            callBack(err);
                            return;
                        }

                        var result = addFriend(reply, user);
                        if (result == null) {
                            callBack(7);
                            return;
                        }
                        //// TODO: 先直接查库,待添加了内存数据后再改成内存中没有则查库 (xiahou 8/18)
                        friendDao.loadByGuid(reply.uid, function(err, resInfo) {
                            if(err){
                                callBack(err);
                                return;
                            }
                            if(resInfo == undefined || resInfo == null) {
                                resInfo = {};
                            }

                            var session = param.session;
                            var otherUser = session.getUser(reply.uid);
                            //// 判断对方是否在线
                            if(otherUser != undefined) {
                                result.self.data.state = 1;
                                otherUser.sendMsg(4288,{result:1, uid: user.uid});
                                /// 查找对方申请列表中是否有自己,有则删除
                                var t_index = getSelfInRequestListByUid(user.uid, otherUser.contMng.friendReq.m_Array);
                                if(t_index >= 0 && t_index < otherUser.contMng.friendReq.m_Array.length)
                                    otherUser.contMng.friendReq.m_Array.splice(t_index, 1);
                                friendReqDao.deleteByGuid(otherUser, user.uid, function(){ });
                            }

                            friends.add(result.self);
                            resultInfo.reqDealList.push(result.self.data);
                            resInfo[result.other.guid] = result.other;
                            friendDao.writeByGuid(reply.uid, resInfo, function(){ });
                            count ++;
                            callBack();
                        });
                    })
                },
                function (err) {
                    console.log('==async.whilst===>err: ',err);
                    if(err){
                        resultInfo.err = 6;
                        next(1, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
                        return;
                    }
                    console.log('=22=278 NI_SC_FRIEND_REQUESTDEAL===>resultInfo: ');
                    //// 全部同意后,申请记录都要清除
                    friendReq.m_Array = [];
                    friendDao.write(user, function(){ });
                    friendReqDao.deleteAllByGuid(user.uid, function(){ });
                    next(null, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
                }
            );
        }
        else {
            //// 全部拒绝后,申请记录都要清除
            friendReq.m_Array = [];
            friendReqDao.deleteAllByGuid(user.uid, function(){ });
            next(null, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
        }
    }
    else{
        resultInfo.err = 3;
        next(1, NID.NI_SC_FRIEND_REQUESTDEAL, resultInfo);
        return;
    }
})

var getSelfInRequestListByUid = function (uid, requestList) {
    if(uid == undefined || requestList == undefined){
        return -1;
    }
    //console.log('===selfInFirendRequestListByUid=>requestList: ', requestList);
    var reqIndex = -1;
    for(var key in requestList){
        if( requestList[key].data != undefined &&
            requestList[key].data.guid == uid){
            reqIndex = key;
            break;
        }
    }
    return reqIndex;
}
