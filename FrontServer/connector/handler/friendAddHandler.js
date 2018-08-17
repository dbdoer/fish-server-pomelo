/**
 * 添加好友
 */
var handlerMgr = require("./../handlerMgr");
var userDao = require('../../../dao/userDao');
var friendReqDao = require('../../../dao/friendReqDao');
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_ADD_FRIEND,function(packetId, param, next){
    var resultInfo = {err: 0}
    var user = param.user();
    var data = param.data;  /// 需加为好友的玩家Uid
    console.log('===282 NI_SC_ADD_FRIEND==>data,user: ',data);
    if(user == undefined || data == undefined || param.session == undefined){
        resultInfo.err = 1;
        next(1, NID.NI_SC_ADD_FRIEND, resultInfo);
        return;
    }
    //自己加自己为好友
    if(data.uid == user.uid){
        resultInfo.err = 2;
        next(1, NID.NI_SC_ADD_FRIEND, resultInfo);
        return;
    }
    userDao.loadByGuid(data.uid, function(err, res){
        if(err){
            resultInfo.err = 3;
            next(1, NID.NI_SC_ADD_FRIEND, resultInfo);
            return;
        }
        if(res == null){
            resultInfo.err = 4;
            next(1, NID.NI_SC_ADD_FRIEND, resultInfo);
            return;
        }
        var session = param.session;
        var tempUser = session.getUser(data.uid);
        //自己的信息
        var friendInfo = {}
        friendInfo.guid = user.data.uid;
        friendInfo.name = user.data.nickname;
        friendInfo.level = user.data.level || 1;
        friendInfo.headurl = user.data.headImage;
        friendInfo.gold = user.data.gold;
        friendInfo.glory = user.data.glory || 0;
        friendInfo.experience = user.data.experience || 0;
        //// 先操作内存,再操作数据库; TODO：退出游戏前记得存库
        if(tempUser != undefined && tempUser.contMng == undefined && tempUser.contMng.friendReq != undefined) {
            //将自己的信息存到对方的请求记录中，内存
            tempUser.contMng.friendReq.add(friendInfo);
            tempUser.sendMsg(NID.NI_SC_FRIEND_REQUEST, {request: 1});
            //将自己的信息存到对方的请求记录中存到redis
            tempUser.write(tempUser, function() {});

            next(null, NID.NI_SC_ADD_FRIEND, resultInfo);
        }
        else {//离线
            //好友的好友申请记录
            friendReqDao.loadByGuid(data.uid, function (err, res) {
                //console.log('**********************************friendReqDao.loadByGuid==>res: ', res)
                if (err) {
                    resultInfo.err = 3;
                    next(1, NID.NI_SC_ADD_FRIEND, resultInfo);
                    return;
                }
                if (res == undefined || res == null) {
                    res = {};
                }
                //重新拼装自己的信息
                res[friendInfo.guid] = friendInfo;
                //结构为好友id为键 ，我的信息为值
                friendReqDao.writeByGuid(data.uid, res, function (err, res) {
                    console.log('===writeByGuid==>err: ', err)
                    if (err) {
                        resultInfo.err = 3;
                        next(1, NID.NI_SC_ADD_FRIEND, resultInfo);
                        return;
                    }
                    //// 推送红点消息
                    if (tempUser != undefined) {
                        tempUser.sendMsg(NID.NI_SC_FRIEND_REQUEST, {request: 1});
                    }
                    console.log('===282 NI_SC_ADD_FRIEND==>resultInfo: ', resultInfo)
                    next(null, NID.NI_SC_ADD_FRIEND, resultInfo);
                })
            });
        }
    });
})
