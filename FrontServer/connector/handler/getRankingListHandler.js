/**
 * 获取排行榜列表
 */
var async = require('async');
var handlerMgr = require("./../handlerMgr");
var userDao = require("../../../dao/userDao");
var ObjFriend = require("../../../obj/objFriend");
var friendDao = require("../../../dao/friendDao");
var NID = handlerMgr.NET_ID;

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

handlerMgr.handler(NID.NI_CS_RANKING_LIST,function(packetId, param, next){
    var session = param.session;
    var user = param.user();
    var data = param.data; //type   uid
    var resultInfo = {err: 0,goldRank :[],masterRank:[],giftRank:[],selfData:[]};
    if(!user){
        resultInfo.err = 1;
        next(1, NID.NI_SC_RANKING_LIST, resultInfo);
        return;
    }
    //console.log('= 275 NI_SC_RANKING_LIST=+++=>data: ', data);
    if(data == null || data.rankType == undefined || data.rankType*1 <= 0 || data.rankType*1 > 2){
        resultInfo.err = 2;
        next(1, NID.NI_SC_RANKING_LIST, resultInfo);
        return;
    }
    if(session == undefined){
        resultInfo.err = 3;
        next(1, NID.NI_SC_RANKING_LIST, resultInfo);
        return;
    }

    //console.log('= 275 redis.keys=+++=>goldRank: ', JSON.stringify(goldRank))
    var l_gold = user.getValue("gold") *1;
    var l_level = user.getValue("level") *1;
    var l_glory = user.getValue("glory") *1;
    //这个数据用于显示排行榜中当前玩家的信息
    var tSelfData = [
        {selfType: 1,selfParam: l_gold || 0},
        {selfType: 2,selfParam: l_level || 1},
        {selfType: 3,selfParam: l_glory || 0}
    ];
    if(data.rankType == 1) {
        //// 世界排行榜的列项
        resultInfo.goldRank = global.g_WorldGoldRank;
        resultInfo.giftRank = global.g_WorldLevelRank;
        resultInfo.masterRank = global.g_WorldMasterRank;
    }
    else{
        //// 好友排行榜的列项
        //自己的数据
        var tempData = {uid: user.uid, name: user.getValue("nickname"),
            level: user.getValue("level") *1, gold: user.getValue("gold") *1,
            headurl: user.getValue("headImage"), param: user.getValue("gold") *1,sex:user.getValue('sex')*1,
            experience: user.getValue("experience"), glory: user.getValue("glory") *1, gem: user.getValue('gem')};
        /// 金币
        var tGoldRank = [tempData];
        /// 等级
        var selfData = {};
        for(var k in tempData){
            selfData[k] = tempData[k];
        }
        selfData.param = user.getValue("level") *1;
        var tLevelRank = [selfData];
        /// 荣誉
        selfData = {};
        for(var k in tempData){
            selfData[k] = tempData[k];
        }
        selfData.param = user.getValue("glory") *1;
        var tMasterRank = [selfData];
        //好友的数据
        var friendList = user.contMng.friends;
        if(friendList != undefined && friendList.m_Array.length > 0){
            for (var key = 0; key < friendList.m_Array.length; key++) {
                var friend = friendList.m_Array[key].data;
                var tempUser = session.getUser(friend.guid);
                if(tempUser != undefined){
                    friend.state = 1;
                }else{
                    friend.state = 0;
                }
                //console.log('****************************************friend', friend);
                if(friend.guid != undefined || friend.guid != null){
                    friendDao.deleteByUid(user.uid,friend.guid,function () {});
                    userDao.loadByGuid(friend.guid,function (err,res) {
                        if(err || res == undefined || res == null){
                            resultInfo.err = 4;
                            next(1, NID.NI_SC_RANKING_LIST, resultInfo);
                            return;
                        }
                        var result = addFriend(res,user);
                        if (result == null) {
                            resultInfo.err = 5;
                            next(1, NID.NI_SC_RANKING_LIST, resultInfo);
                            return;
                        }
                        //将好友数据添加到内存
                        friendList.add(result.friend);
                        //将好友数据存库
                        friendDao.write(user, function(){});
                    });
                }

                if(friend.guid == user.uid){ continue; }
                var rankData = {uid: friend.guid, name: friend.name,
                    level: friend.level *1, gold: friend.gold *1,
                    headurl: friend.headurl, param: friend.gold *1,sex: friend.sex*1,
                    experience: friend.experience*1, glory: friend.glory*1, gem: friend.gem*1};

                /// 金币
                tGoldRank.push(rankData);
                //排序
                if(tGoldRank != undefined || tGoldRank != null){
                    tGoldRank.sort(function (rec1,rec2) {
                        return Number(rec2.param) - Number(rec1.param);
                    });
                }
                /// 等级
                selfData = {};
                for(var k in rankData){
                    selfData[k] = rankData[k];
                }
                selfData.param = friend.level *1;
                tLevelRank.push(selfData);
                //排序
                if(tLevelRank != undefined || tLevelRank != null){
                    tLevelRank.sort(function (rec1,rec2) {
                        return Number(rec2.param) - Number(rec1.param);
                    });
                }

                /// 荣誉
                selfData = {};
                for(var k in rankData){
                    selfData[k] = rankData[k];
                }
                selfData.param =  friend.glory *1;
                tMasterRank.push(selfData);
                //排序
                if(tMasterRank != undefined || tMasterRank != null){
                    tMasterRank.sort(function (rec1,rec2) {
                        return Number(rec2.param) - Number(rec1.param);
                    });
                }

            }
        }
        //console.log('**********************************tGoldRank',tGoldRank);
        resultInfo.goldRank = tGoldRank;
        resultInfo.masterRank = tMasterRank;
        resultInfo.giftRank = tLevelRank;
    };
    resultInfo.selfData = tSelfData;
    //console.log('*****************resultInfo',resultInfo);
    //console.log('=275=NI_SC_RANKING_LIST===>resultInfo: ',JSON.stringify(resultInfo));
    next(null, NID.NI_SC_RANKING_LIST, resultInfo);
})
