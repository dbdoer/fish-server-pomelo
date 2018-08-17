/**
 * 查找好友   只是用来显示查找的好友存在或者不存在，存在返回好友信息
 */
var handlerMgr = require("./../handlerMgr");
var userDao = require('../../../dao/userDao');
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_FIND_FRIEND,function(packetId, param, next){
    var resultInfo = {err: 0, playerInfo :{}}
    var user = param.user();
    var data = param.data;  ///keyWord 默认先查询昵称后查询ID
    if(user == undefined || data == undefined || param.session == undefined){
        resultInfo.err = 1;
        next(1, NID.NI_SC_FIND_FRIEND, resultInfo);
        return;
    }

    //console.log('===279 NI_SC_FIND_FRIEND==>data: ',data)
    if(user.data.outsideUuid == data.keyWord){  ///不能添加自己为好友
        resultInfo.err = 2;
        next(1, NID.NI_SC_FIND_FRIEND, resultInfo);
        return;
    }

    userDao.loadByShowId(data.keyWord, function(err, resInfo){
        //console.log('=== userDao.loadByShowId==>err,resInfo: ',err,resInfo)
        if(err){
            resultInfo.err = 3;
            next(1, NID.NI_SC_FIND_FRIEND, resultInfo);
            return;
        }
        if (resInfo == null || resInfo == undefined) {
            resultInfo.err = 4;
            next(1, NID.NI_SC_FIND_FRIEND, resultInfo);
            return;
        }

        if(user.uid == resInfo){  ///不能添加自己为好友
            resultInfo.err = 2;
            next(1, NID.NI_SC_FIND_FRIEND, resultInfo);
            return;
        }
        /// resInfo: 玩家的uid
        var session = param.session;
        var tempUser = session.getUser(resInfo);
        if(tempUser != undefined){
            var friendInfo ={};
            friendInfo.guid = tempUser.data.uid;
            friendInfo.name = tempUser.data.nickname;
            friendInfo.level = tempUser.data.level;
            friendInfo.headurl = tempUser.data.headImage;
            friendInfo.gold = tempUser.data.gold;
            friendInfo.gem = tempUser.data.gem;
            friendInfo.glory = tempUser.data.glory;
            friendInfo.experience = tempUser.data.experience;
            friendInfo.state = 1;

            //console.log('=1111=279 NI_SC_FIND_FRIEND===>resultInfo ',friendInfo);
            resultInfo.playerInfo = friendInfo;
            next(null, NID.NI_SC_FIND_FRIEND, resultInfo);
        }
        else {
            userDao.loadByGuid(resInfo, function (err, res) {
                if (err) {
                    resultInfo.err = 3;
                    next(1, NID.NI_SC_FIND_FRIEND, resultInfo);
                    return;
                }
                if (res == null) {
                    resultInfo.err = 4;
                    next(1, NID.NI_SC_FIND_FRIEND, resultInfo);
                    return;
                }
                var friendInfo = {};
                friendInfo.guid = res.uid;
                friendInfo.name = res.nickname;
                friendInfo.level = res.level || 1;
                friendInfo.headurl = res.headImage;
                friendInfo.gold = res.gold*1;
                friendInfo.gem = res.gem*1;
                friendInfo.glory = res.glory || 0;
                friendInfo.experience = res.experience || 0;

                //console.log('=2222=279 NI_SC_FIND_FRIEND===>resultInfo ',friendInfo);
                resultInfo.playerInfo = friendInfo;
                next(null, NID.NI_SC_FIND_FRIEND, resultInfo);
            });
        }
    });
})
