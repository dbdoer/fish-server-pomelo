/**
 * 获取好友列表
 */
var handlerMgr = require("./../handlerMgr");
var friendDao = require('../../../dao/friendDao');
var userDao = require("../../../dao/userDao");
var ObjFriend = require("../../../obj/objFriend");
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_GET_FRIENDLIST,function(packetId, param, next){
    var resultInfo = {err: 0, friendsList:[]};
    var session = param.session;
    var user = param.user();
    if(!user || session == undefined){
        resultInfo.err = 1;
        next(1, NID.NI_SC_GET_FRIENDLIST, resultInfo);
        return;
    }

    //先更新下好友的数据
    var addFriend = function(reply, user){
        if(reply == undefined || user == undefined){
            return null;
        }
        //好友信息
        var Friend = new ObjFriend();
        Friend.setValue("guid", reply.uid);
        Friend.setValue("name", reply.nickname);
        Friend.setValue("sex", reply.sex|| 0);
        Friend.setValue("level", reply.level || 1);
        Friend.setValue("headurl", reply.headImage);
        Friend.setValue("vipLv", reply.vipLv || 0);
        Friend.setValue("gold", reply.gold*1);
        Friend.setValue("gem", reply.gem*1);
        Friend.setValue("glory", reply.glory || 0);
        Friend.setValue("experience", reply.experience || 0);

        //自己的信息
        var self = {};
        self.guid  = user.uid;
        self.name = user.data.nickname;
        self.sex = user.data.sex || 0;
        self.level = user.data.level || 1;
        self.headurl = user.data.headImage;
        self.vipLv = user.data.vipLv || 0;
        self.gold = user.data.gold || 0;
        self.gem = user.data.gem*1;
        self.glory = user.data.glory || 0;
        self.experience = user.data.experience || 0;
        self.state = 1;  /// 操作同意申请就说明玩家是在线

        return {friend:Friend, self: self};
    }
    var friendList = user.contMng.friends;
    if(friendList != undefined && friendList.m_Array.length > 0){
        for (var key = 0; key < friendList.m_Array.length; key++) {
            var _friend = friendList.m_Array[key].data;
            var tempUser = session.getUser(_friend.guid);
            if(tempUser != undefined){
                _friend.state = 1;
            }else{
                _friend.state = 0;
            }
            if(_friend.guid != undefined || _friend.guid != null){
                friendDao.deleteByUid(user.uid,_friend.guid,function () {});
                userDao.loadByGuid(_friend.guid,function (err,res) {
                    if(err || res == undefined || res == null){
                        return;
                    }
                    var result = addFriend(res,user);
                    if (result == null) {
                        return;
                    }
                    //将好友数据添加到内存
                    friendList.add(result.friend);
                    //将好友数据存库
                    friendDao.write(user, function(){});
                });
            }
        }
    }

    //console.log("==>276 NI_CS_GET_FRIENDLIST <====");
    var friendsList = user.contMng.friends;
    //先取内存，没有则查库
    if(friendsList != undefined && friendsList.m_Array.length > 0){
        var info = [];
        for (var key = 0; key < friendsList.m_Array.length; key++) {
            var friend = friendsList.m_Array[key].data;
            //console.log('***********************内存friend',friend);
            var tempUser = session.getUser(friend.guid);
            if(tempUser != undefined) {
                friend.state = 1;  /// 在线
            }else{
                friend.state = 0;  /// 不在线
            }
            info.push(friend);
            //排序
            info.sort(function(rec1, rec2) {
                return Number(rec2.param) - Number(rec1.param);
            });
        }
        //console.log('**************************info',info);
        resultInfo.friendsList = info;
        resultInfo.friendsList.sort(function(rec1, rec2) {
            return Number(rec2.gold) - Number(rec1.gold);
        });
        //console.log('************************resultInfo',resultInfo);
        //console.log("=11=>276 NI_CS_GET_FRIENDLIST ==>info: ",info);
        next(null, NID.NI_SC_GET_FRIENDLIST, resultInfo);

    } else { //内存没有查库
        friendDao.load(user, function (err, res) {
            var friends = user.contMng.friends;
            if (err || friends == undefined) {
                resultInfo.err = 2;
                next(1, NID.NI_SC_GET_FRIENDLIST, resultInfo);
                return;
            } else {
                var info = [];
                for (var key = 0; key < friends.m_Array.length; key++) {
                    var friend = friendsList.m_Array[key].data;
                    //console.log('***********************读库friend',friend);
                    var tempUser = session.getUser(friend.guid);
                    if(tempUser != undefined) {
                        friend.state = 1;  /// 在线
                    }else{
                        friend.state = 0;  /// 不在线
                    }
                    info.push(friend);

                }

                //console.log("=22=>276 NI_CS_GET_FRIENDLIST==> info: ",info);
                resultInfo.friendsList = info;
                //排序
                resultInfo.friendsList.sort(function(rec1, rec2) {
                    return Number(rec2.gold) - Number(rec1.gold);
                });
                next(null, NID.NI_SC_GET_FRIENDLIST, resultInfo);
            }
        })
    }
})
