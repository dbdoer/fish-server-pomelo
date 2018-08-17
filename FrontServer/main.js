"use strict";
/**
 * Created by ck01-441 on 2016/2/25.
 * socket前端服务器
 * 负责与客户端相连
 * 处理简单逻辑
 * 将请求转至正确的后端服务器
 * 加载路由(包id)逻辑处理
 * rpc机制
 * session管理
 */

var server;
if(typeof (process.argv[2]) !== 'undefined'){
    //console.log("--------------- "+ JSON.stringify(process.argv[2]));
    server = JSON.parse(process.argv[2]);
}

var conf = require("../conf/config").FrontServer;
if (!server)server = {
    local: conf.ip,
    socket: conf.socketPort,
    rpc: conf.rpcPort,
    master: conf.master
};


//var serverConfig = JSON.parse(process.argv[2]);
var serverConfig = server;
var LOCAL_ADDRESS = serverConfig.local; //本机地址
var SOCKET_PORT = serverConfig.socket;
var RPC_SOCKET = serverConfig.rpc;
var MASTER_INFO = serverConfig.master;



//各种常量
var SERVER_TYPE = "FrontServer";
var serverId = SERVER_TYPE + ":" + LOCAL_ADDRESS + ":" + SOCKET_PORT + ":" + RPC_SOCKET;

require('../Resources');//加载各个config到内存中
var net = require("net");
var ObjMail = require('../obj/objMail');
var dataParser = require("./MsgParser.js");
var session = require("../session/session.js");
var async = require('../node_modules/async');
//var redis = require("../database/redis.js").getCluster(); //redis集群 包含了大部分redis功能
//redis 初始化
var _redis = require("../conf/redis.json");
require("../dao/redis/redis").configure(_redis);
var redis = require('../dao/redis/redisCmd');
var rpcManager = require("../rpc/RpcManager.js")();
var rpcServer = require("../rpc/RpcServer")();
var roomManger = require("./RoomManager")(rpcManager, MASTER_INFO, serverId);
var logger = require("../common/logHelper").helper;
var redis2mysql = require('../dao/redis2mysql');
var rechargeList = require("../ProcessDB/selectOrInsert")();
var handlerMgr = require("./connector/handlerMgr");
var rpcMgr = require("./rpcModule/rpcMgr");
var NID = handlerMgr.NET_ID;

var COMM = require("../common/commons");
var mall_gold = require('../Resources/gold');
var mall_diamond = require('../Resources/diamond');
var giftPackage = require("../Resources/giftPackage");
var shouchong = require("../Resources/shouchong");
var otherGift = require("../Resources/otherGift");
var quota = require('../Resources/quota');

var mall_diamond_En = require('../Resources/English/diamond');
var mall_gold_En = require('../Resources/English/gold');
var giftPackage_En = require("../Resources/English/giftPackage");
var shouchong_En = require("../Resources/English/shouchong");
var otherGift_En = require("../Resources/English/otherGift");
var quota_En = require('../Resources/English/quota');
var activityMgr = require("./modules/activityMng");
var REDIS_KEY_TID = "fish4PaymentTid"

var LENGTH_BYTE = 2;
var PACKAGE_ID_BYTE = 4;
var MESSAGE_ID = 1;  /// 全服公告Message ID
var REDIS_KEY_MAIL = "fish4mail:";// mail
var DEPENDENCIES_SERVERS = ["RoomServer", 'FrontServer', 'MatchQueueServer', 'FastMatchServer', 'BigMatchServer', 'TransfeServer']; //需要通过rpc进行连接的server类型
logger.info("-------- front server start --------");
//------全局变量
global.g_GameBreaker = {}; //Debug功能中是否必杀各种鱼
global.loginuuid = {};
global.serverId = serverId;
global.roomManager = roomManger;
//global.mail = mail;
global.RankType ={
    GOLD : 1
    ,LEVEL : 2
    ,MASTER : 3
}
global.g_LoginOutRankByUser = {};
global.g_WorldGoldRank = [];  ///世界财富榜
global.g_WorldLevelRank = [];  ///世界等级榜
global.g_WorldMasterRank = [];  ///世界大师分榜
global.g_saveRankTime = Math.floor(Date.now() /1000);
var REDIS_KEY_GOLD_RANK = "fish4goldrank";
var REDIS_KEY_LEVEL_RANK = "fish4levelrank";
var REDIS_KEY_MASTER_RANK = "fish4masterrank";

//获取注册文件夹里的所有文件
var handlerMgr = require("./connector/handlerMgr");
handlerMgr.register("./connector/handler");

var rpcMgr = require("./rpcModule/rpcMgr");
rpcMgr.register("./rpcModule/handler");

//初始化session
session.init(rpcManager);
//注册消息处理机制
//router.loadLogicFile("./logic.js");
//router.loadLogicFile("./modules/battle.js");

//// ----START------全局各个排行榜数据------------
/// 存储下线的玩家数据,主要是release（）下线释放方法中调用
global.saveLoginOutRankInfoByUser = function(userInfo){
    if(userInfo == undefined){
        return;
    }

    global.g_LoginOutRankByUser[userInfo.uid] = {}; /// 每次下线先清空之前的数据
    var tempRankData = global.g_LoginOutRankByUser[userInfo.uid] || {};
    /// ====> 排行榜基础数据(用于查看) <=========
    tempRankData.uid = userInfo.uid;
    tempRankData.name = userInfo.nickname||"";
    tempRankData.level = userInfo.level || 1;
    tempRankData.headurl = userInfo.headImage|| 1;
    tempRankData.experience = userInfo.experience|| 0;
    tempRankData.glory = userInfo.glory || 0;
    tempRankData.gem = userInfo.gem*1;
    tempRankData.sex = userInfo.sex*1;

    /// ====> 根据排行榜的需求保存数据 <=========
    tempRankData.paramGold =  userInfo.gold *1 || 0;
    tempRankData.paramLevel =  userInfo.level *1 || 1;
    tempRankData.paramGlory =  userInfo.glory *1 || 0;
    //console.log('*************************tempRankData',tempRankData);
    //console.log('===> g_LoginOutRankByUser: ', global.g_LoginOutRankByUser);
    return 0;
}
/// 获取排行榜数据（将查询结果赋值给全局变量）
var getWorldRankByRankType = function(rankType){
    if(rankType == undefined){
        console.log("=Err==>getWorldRankByRankType rankType == undefined ");
        return;
    }
    var tKey;
    if(rankType == 1){
        tKey = REDIS_KEY_GOLD_RANK;
    } else if(rankType == 2){
        tKey = REDIS_KEY_LEVEL_RANK;
    } else if(rankType == 3){
        tKey = REDIS_KEY_MASTER_RANK;
    }
    if(tKey != undefined){
        redis.hgetall(tKey, function (err, result) {
            if (err || result == undefined || result == null) {
                console.log("===7777777==>getWorldRankByRankType Err: ",err, result);
                return;
            }
            //// 添加数据到数组
            for(var key in result){
                if(result[key] == undefined){
                    continue;
                }
                if(rankType == 1){
                    global.g_WorldGoldRank.push(JSON.parse(result[key]));
                } else if(rankType == 2){
                    global.g_WorldLevelRank.push(JSON.parse(result[key]));
                } else if(rankType == 3){
                    global.g_WorldMasterRank.push(JSON.parse(result[key]));
                }
            }
            //// 数组排序(从大到小)
            if(rankType == 1){
                global.g_WorldGoldRank.sort(function(rec1, rec2) {
                    return Number(rec2.param) - Number(rec1.param);
                });
            } else if(rankType == 2){
                global.g_WorldLevelRank.sort(function(rec1, rec2) {
                    return Number(rec2.param) - Number(rec1.param);
                });
            } else if(rankType == 3){
                global.g_WorldMasterRank.sort(function(rec1, rec2) {
                    return Number(rec2.param) - Number(rec1.param);
                });
            }
        });
    }else {
        console.log("=Err==>getWorldRankByRankType tKey == undefined !!");
    }
    return;
}
//再次获取排序整理后的数据
var getAgainSortRank = function (arrRankInfo, maxRankNum) {
    if(arrRankInfo == undefined || arrRankInfo.length <=0 ){
        return;
    }
    if(maxRankNum == undefined || maxRankNum <= 0){
        return;
    }
    /// 重新排序(从大到小)
    arrRankInfo.sort(function (rec1, rec2) {
        return Number(rec2.param) - Number(rec1.param);
    });
    /// 删除多余元素
    if (arrRankInfo.length > maxRankNum *1) {
        arrRankInfo.splice(maxRankNum *1, arrRankInfo.length - maxRankNum *1);
    }

    return arrRankInfo;
};
/// 添加或替换排行榜数据，主要针对在线用户
var addOrReplaceWorldRank = function(rankType, userInfo){
    if(rankType == undefined || userInfo == undefined){
        return -1;
    }
    if(rankType < global.RankType.GOLD || rankType > global.RankType.MASTER){
        return -2;
    }
    var tempRankData = [];
    if(rankType == global.RankType.GOLD){
        tempRankData = g_WorldGoldRank;
    } else if(rankType == global.RankType.LEVEL){
        tempRankData = g_WorldLevelRank;
    } else if(rankType == global.RankType.MASTER){
        tempRankData = g_WorldMasterRank;
    }
    /// 判断是否超出最大值
    if(tempRankData.length >= global.other[1].rankinglist *1){
        return -3;
    }

    /// 判断是否存在或替换
    var isExist = false;
    var isChange = false;  /// 数组是否有变化
    for(var i =0; i <tempRankData.length; i++){
        if(tempRankData[i] == undefined){ continue; }
        //在线玩家的数据更新操作
        if(tempRankData[i].uid == userInfo.uid){
            isExist = true;
            tempRankData[i].name = userInfo.nickname||"";
            tempRankData[i].level = userInfo.level *1|| 1;
            tempRankData[i].headurl = userInfo.headImage|| 1;
            tempRankData[i].experience = userInfo.experience||"";
            tempRankData[i].glory = userInfo.glory|| 0;
            tempRankData[i].gem = userInfo.gem * 1;
            tempRankData[i].sex = userInfo.sex*1;
            /// 是否更新
            if(rankType == global.RankType.GOLD && tempRankData[i].param *1 != userInfo.gold *1){
                tempRankData[i].param = userInfo.gold *1;
                isChange = true;
            } else if(rankType == global.RankType.LEVEL && tempRankData[i].param *1 != userInfo.level *1){
                tempRankData[i].param = userInfo.level *1;
                tempRankData[i].gold = userInfo.gold *1;  /// 用于查看时显示
                isChange = true;
            } else if(rankType == global.RankType.MASTER && tempRankData[i].param *1 != userInfo.glory *1){
                tempRankData[i].param = userInfo.glory *1;
                tempRankData[i].gold = userInfo.gold *1;  /// 用于查看时显示
                isChange = true;
            }
        }
    }
    //// 不存在则添加
    if(isExist == false){
        var tempParam ;
        if(rankType == global.RankType.GOLD){
            tempParam = userInfo.gold *1;
        } else if(rankType == global.RankType.LEVEL){
            tempParam = userInfo.level *1;
        } else if(rankType == global.RankType.MASTER){
            tempParam = userInfo.glory *1;
        }
        tempRankData.push({uid: userInfo.uid, name: userInfo.nickname, level: userInfo.level,sex:userInfo.sex,
            headurl: userInfo.headImage, param: tempParam, experience: userInfo.experience, glory: userInfo.glory,gem:userInfo.gem});
        isChange = true;
    }
    if(isChange == true) {
        var rankData = getAgainSortRank(tempRankData, global.other[1].rankinglist *1) || [];
        if(rankData != undefined && rankData.length > 0){
            tempRankData = rankData;
        }
    }
    if(rankType == 1){
        global.g_WorldGoldRank = tempRankData;
    } else if(rankType == 2){
        global.g_WorldLevelRank = tempRankData;
    } else if(rankType == 3){
        global.g_WorldMasterRank = tempRankData;
    }
    //global.g_saveRankTime = Math.floor(Date.now() /1000);
}
/// 保存排行榜数据到redis
global.saveWorldRank = function(){
    if(global.g_WorldGoldRank != undefined && global.g_WorldGoldRank.length > 0){
        var tData = {};
        for(var i=0; i<global.g_WorldGoldRank.length; i++){
            var _obj = global.g_WorldGoldRank[i];
            if(!_obj){
                continue;
            }
            tData[_obj.uid] = JSON.stringify(_obj);
        }
        redis.hmset(REDIS_KEY_GOLD_RANK, tData, function (err, result) { });
    }
    if(global.g_WorldLevelRank != undefined && global.g_WorldLevelRank.length > 0){
        var tData = {};
        for(var i=0; i<global.g_WorldLevelRank.length; i++){
            var _obj = global.g_WorldLevelRank[i];
            if(!_obj){
                continue;
            }
            tData[_obj.uid] = JSON.stringify(_obj);
        }
        redis.hmset(REDIS_KEY_LEVEL_RANK, tData, function (err, result) { });
    }
    if(global.g_WorldMasterRank != undefined && global.g_WorldMasterRank.length > 0){
        var tData = {};
        for(var i=0; i<global.g_WorldMasterRank.length; i++){
            var _obj = global.g_WorldMasterRank[i];
            if(!_obj){
                continue;
            }
            tData[_obj.uid] = JSON.stringify(_obj);
        }
        redis.hmset(REDIS_KEY_MASTER_RANK, tData, function (err, result) { });
    }
}
getWorldRankByRankType(global.RankType.GOLD);
getWorldRankByRankType(global.RankType.LEVEL);
getWorldRankByRankType(global.RankType.MASTER);

var serverStartTimeOut = function () {
    var rankUpdateTime = setTimeout(function () {
        var tempSession = session;
        /// ===> 处理在线玩家的数据 <====
        for(var key in tempSession.getUserList) {
            var userInfo = tempSession.getUserList[key];
            if(userInfo != undefined){
                addOrReplaceWorldRank(global.RankType.GOLD, userInfo.data);
                addOrReplaceWorldRank(global.RankType.LEVEL, userInfo.data);
                addOrReplaceWorldRank(global.RankType.MASTER, userInfo.data);
            }
        }

        /// ===> 处理保存的离线玩家的数据 <====
        for(var key in global.g_LoginOutRankByUser) {
            var t_userInfo = global.g_LoginOutRankByUser[key];
            if(t_userInfo == undefined){ continue; }
            var isExist = false;
            /// 金币排行榜
            for (var ig = 0; ig < global.g_WorldGoldRank.length; ig++) {
                var info = global.g_WorldGoldRank[ig];
                if (info == undefined) { continue; }
                /// 存在跳过
                if (info.uid == key) {
                    isExist = true;
                    info.name = t_userInfo.name;
                    info.level = t_userInfo.level;
                    info.headurl = t_userInfo.headurl;
                    info.experience = t_userInfo.experience;
                    info.glory = t_userInfo.glory;
                    info.param  = t_userInfo.paramGold;
                    info.gem  = t_userInfo.gem;
                    info.sex = t_userInfo.sex;
                    break; }
            }
            if(isExist == false){
                global.g_WorldGoldRank.push({
                    uid: t_userInfo.uid, name: t_userInfo.name,  level: t_userInfo.level, experience: t_userInfo.experience,
                    headurl: t_userInfo.headurl, glory: t_userInfo.glory, param: t_userInfo.paramGold, gem: t_userInfo.gem,sex: t_userInfo.sex
                });
            }
            /// 等级排行榜
            isExist = false;
            for (var il = 0; il < global.g_WorldLevelRank.length; il++) {
                var info = global.g_WorldLevelRank[il];
                if (info == undefined) { continue; }
                /// 存在跳过
                if (info.uid == key) {
                    isExist = true;
                    info.name = t_userInfo.name;
                    info.level = t_userInfo.level;
                    info.headurl = t_userInfo.headurl;
                    info.experience = t_userInfo.experience;
                    info.glory = t_userInfo.glory;
                    info.param  = t_userInfo.paramLevel;
                    info.gem  = t_userInfo.gem;
                    info.sex = t_userInfo.sex;
                    break;
                }
            }
            if(isExist == false){
                global.g_WorldLevelRank.push({
                    uid: t_userInfo.uid, name: t_userInfo.name,  level: t_userInfo.level, experience: t_userInfo.experience,
                    headurl: t_userInfo.headurl, glory: t_userInfo.glory, param: t_userInfo.paramLevel,gem:t_userInfo.gem, sex: t_userInfo.sex
                });
            }
            /// 大师排行榜
            isExist = false;
            for (var im = 0; im < global.g_WorldMasterRank.length; im++) {
                var info = global.g_WorldMasterRank[im];
                if (info == undefined) { continue; }
                /// 存在跳过
                if (info.uid == key) {
                    isExist = true;
                    info.name = t_userInfo.name;
                    info.level = t_userInfo.level;
                    info.headurl = t_userInfo.headurl;
                    info.experience = t_userInfo.experience;
                    info.glory = t_userInfo.glory;
                    info.param  = t_userInfo.paramGlory;
                    info.gem  = t_userInfo.gem;
                    info.sex = t_userInfo.sex;
                    break;
                }
            }
            if(isExist == false){
                global.g_WorldMasterRank.push({
                    uid: t_userInfo.uid, name: t_userInfo.name, level: t_userInfo.level, experience: t_userInfo.experience,
                    headurl: t_userInfo.headurl, glory: t_userInfo.glory, param: t_userInfo.paramGlory, gem: t_userInfo.gem,sex: t_userInfo.sex
                });
            }
        }

        var rankData = getAgainSortRank(global.g_WorldGoldRank, global.other[1].rankinglist *1) || [];
        if(rankData != undefined && rankData.length > 0){
            global.g_WorldGoldRank = rankData;
        }
        rankData = getAgainSortRank(global.g_WorldLevelRank, global.other[1].rankinglist *1) || [];
        if(rankData != undefined && rankData.length > 0){
            global.g_WorldLevelRank = rankData;
        }
        rankData = getAgainSortRank(global.g_WorldMasterRank, global.other[1].rankinglist *1) || [];
        if(rankData != undefined && rankData.length > 0){
            global.g_WorldMasterRank = rankData;
        }
        global.g_LoginOutRankByUser = {}; /// 每次存完后清空
        global.saveWorldRank();
        serverStartTimeOut();
    }, global.other[1].ranking_refreshtime * 60 * 60 * 1000);
};
serverStartTimeOut();
//// ----END------全局各个排行榜数据------------
//rpc
//rpcServer.registerRemoteFunc("pushMsg2local", session.pushMsg2local);
rpcServer.registerRemoteFunc(require("./rpcModule/login.js")(redis)); //登录用rpc 供gate调用
//向client发送由其他服务器推送的消息
rpcServer.registerRemoteFunc('push2client', session.pushMsg2uid); //根据uid来发送

/**
 * noticeType = 0:系统公告  1:游戏公告打死boss鱼   2:游戏公告获得钻石奖
 * playerInfo = {uid, pos, headurl, name}
 * content = []
 */
rpcServer.registerRemoteFunc('sendNoticeToFrontServer', function(noticeType, playerInfo, fishInfo,content, cb){
    //console.log('==sendToTransfeServer==>44444444444',noticeType, playerInfo, content);
    if (noticeType == undefined || playerInfo == undefined || fishInfo == undefined) {
        cb(1);return;
    }
    /*if(Notice[noticeType] == undefined){
        cb(2);return;
    }
    if(Notice[noticeType].content == undefined){
        cb(3);return;
    }
    var stringArr = Notice[noticeType].content.split('%s');
    var string = '';*/
    /*for(var i =0; i< content.length; i++){
        if(content[i] != undefined) {
            string += stringArr[i] + content[i];
        }
    }
    if(stringArr.length > content.length){
        for(var j = stringArr.length - content.length; j> 0; j--){
            string += stringArr[stringArr.length -j];
        }
    }*/

   // console.log('==111Room Explosion==>MESSAGE_ID, string: ',MESSAGE_ID,string);
    //console.log('==111Room Explosion==>MESSAGE_ID, noticeType,playerInfo,fishInfo,content ',noticeType,playerInfo,fishInfo,content);
    for(var key in session.getUserList)
    {
        var userInfo = session.getUserList[key];
        if(userInfo != undefined){
            userInfo.sendMsg(NID.NI_SC_FULL_SERVICE_NOTICE_DATA, {
                templateMessageData:{
                    senderPersonalData: playerInfo,
                    channelId: userInfo.getValue('channel'),
                    messageId: MESSAGE_ID,
                    fishId:fishInfo.fishId,
                    fishGold:fishInfo.fishGold,
                    matchId:fishInfo.matchId,
                    rewardGold:fishInfo.rewardGold,
                    sendType:noticeType,
                    content:content
                }
            });
        }
    }
    
    MESSAGE_ID++;
    cb(null,true);
});
/**
 * sendType = 1:指定玩家  0:全服
 * mailInfo = [{},{},...]
 * userInfo = [uid,uid,...]
 */
rpcServer.registerRemoteFunc('sendMailToFrontServer', function(sendType, mailInfo, userInfo, cb){
    console.log('------------------------sendType,mailInfo,userInfo',sendType,mailInfo,userInfo);
    if(sendType == undefined || mailInfo == undefined){
        cb(1);return;
    }
    //console.log('=sendMailToFrontServer==>sendType,mailInfo: ',sendType,mailInfo,userInfo);
    /// 指定玩家发送邮件
    if(sendType > 0){
        if(userInfo == undefined){
            cb(1);return;
        }

        if(userInfo.length != mailInfo.length){
            logger.err('=CareteMail==>userInfo.length != mailInfo.length!!')
        }

        var u = 0;
        var recurse = function() {
            if(mailInfo[u] == undefined || userInfo[u] == undefined){
                logger.err('=CareteMail==>mailInfo[u]: ' + mailInfo[u] + ", userInfo[u]: " + userInfo[u] + ", u: "+u);
                u++;
                if (u < userInfo.length) {
                    recurse();
                }
                return;
            }

            var userData = session.getUserList[userInfo[u]];
            //console.log('------------------------userData',userData);
            var tempMail = mailInfo[u];

            var newMailData = new ObjMail();
            newMailData.setValue("type", tempMail.type);
            newMailData.setValue("templateId", tempMail.templateId); /// 模板id
            newMailData.setValue("replacement", tempMail.replacement); /// 邮件内容替换符
            newMailData.setValue("itemList", tempMail.itemList || []);
            newMailData.setValue("title", tempMail.title || "");

            if(userData !== undefined) {
                var data = {messageType: 1, mailList: [newMailData.data]};
                userData.contMng.mails.add(newMailData);
                console.log('------------------------data',data);
                userData.sendMsg(NID.NI_SC_MESSAGE_REMIND, data);
            }
            /// 在不在线都保存    /*保存的目的：1、可以查看到所有的邮件数据 2、不在线的玩家上线后会从库里面拿发送的邮件*/
            var arrMail = {};
            arrMail[newMailData.data.id] = JSON.stringify(newMailData.data);
            redis.hmset(REDIS_KEY_MAIL + userInfo[u], arrMail, function () {
                u++;
                if (u < userInfo.length) {
                    recurse();
                }
            });
        }
        recurse();
        cb(null,true);
    }
    else{
        var tempMail = mailInfo[0];
        if(tempMail == undefined){
            cb(1);return;
        }
        var newMailData = new ObjMail();
        newMailData.setValue("type", tempMail.type);
        newMailData.setValue("templateId", tempMail.templateId); /// 模板id
        newMailData.setValue("replacement", tempMail.replacement); /// 邮件内容替换符   //告诉前端如果收到type=3就不从模板里面替换邮件内容replacement
        newMailData.setValue("itemList", tempMail.itemList || []);
        var data = {messageType: 1, mailList: [newMailData.data]};
        redis.keys("fish4user:" + "*" , function (err,ret) {
            //console.log("-----------------------ret",ret);
            var arrMail = {};
            arrMail[newMailData.data.id] = JSON.stringify(newMailData.data);

            var count = 0;
            var test = function () {
                return count<ret.length;
            };
            var fn = function(callback){
                var userData = session.getUserList[ret[count].split(":")[1]];
                if(userData !== undefined) {
                    //console.log('------------------------[newMailData.data]2',[newMailData.data]);
                    userData.contMng.mails.add(newMailData);
                    userData.sendMsg(NID.NI_SC_MESSAGE_REMIND, data);
                }
                /// 在不在线都保存
                //console.log('------------------------newMailData.data2',newMailData.data);
                redis.hmset(REDIS_KEY_MAIL + ret[count].split(":")[1], arrMail, function () {
                    count++;
                    callback();
                });
            };

            async.whilst(test,fn,function(err){
                if(err){
                    console.log("--------------maillStore--err",err);
                }
                console.log('whilst结束');
            });
        });
        cb(null,true);
    }
});

rpcServer.registerRemoteFunc('fastMatchRankReward', function(paramReward, cb){
    if(paramReward == undefined ){
        cb(1);return;
    }
    //console.log('====fastMatchRankReward==>paramReward: ', JSON.stringify(paramReward));
    var offlineUser = [];
    for(var p =0; p < paramReward.length; p++){
        var rewardInfo = paramReward[p];
        if(rewardInfo.uid == undefined || rewardInfo.goodsList == undefined){
            continue;
        }
        var userData = session.getUserList[rewardInfo.uid];
        if(userData !== undefined) {
            var l_gold = userData.getValue('gold') *1;
            var l_gem = userData.getValue('gem') *1;
            var l_glory = userData.getValue('glory') *1;
            var goods = [];
            for(var g =0; g < rewardInfo.goodsList.length; g++){
                var g_info = rewardInfo.goodsList[g];
                var g_propData = global.prop[g_info.type];
                if(g_info != undefined && g_propData != undefined){
                    if(g_info.type *1 == 1002){
                        l_gold += g_info.number *1 ||0;
                    }else if(g_info.type *1 == 1003){
                        l_gem += g_info.number *1 ||0;
                    }else if(g_info.type *1 == 1004){
                        l_glory += g_info.number *1 ||0;
                    }else{
                        goods.push({id:g_info.type, type: g_propData.exchange_type, num:g_info.number})
                    }
                }
            }
            userData.fillBag(goods);
            userData.setValue("gold", l_gold);
            userData.setValue("gem", l_gem);
            userData.setValue("glory", l_glory);
            userData.writeToDb(function () { });
        }else{
            offlineUser.push(rewardInfo);
        }
    }
    if(offlineUser.length > 0){
        var count = 0;
        async.whilst(function(){
            return count < offlineUser.length;
        },function(callback){
            var templeId = 4;
            var tempMail = global.mail[templeId];
            var strArr = tempMail.content.split('%s');
            var repContent = [];
            if(strArr.length > 0 && tempMail.mail_type *1 == 2)
            {///有字符替换
                repContent[0] = offlineUser[count].name;
                repContent[1] = offlineUser[count].matchPlayerNum *1;
                repContent[2] = offlineUser[count].matchName;
                repContent[3] = offlineUser[count].rankNum;
            }
            var itemList = [];
            if(offlineUser[count].goodsList.length > 0){
                for(var g =0; g< offlineUser[count].goodsList.length; g++){
                    itemList.push({goodId: offlineUser[count].goodsList[g].type, goodNum: offlineUser[count].goodsList[g].number});
                }
            }
            var newMailData = new ObjMail();
            newMailData.setValue("type", tempMail.mail_type);
            newMailData.setValue("templateId", templeId); /// 模板id
            newMailData.setValue("replacement", repContent); /// 邮件内容替换符
            newMailData.setValue("itemList", itemList);
            newMailData.setValue("title", tempMail.title||"");
            var arrMail = {};
            arrMail[newMailData.data.id] = JSON.stringify(newMailData.data);
            //console.log("------fastMatchRankReward-->arrMail: ",arrMail);
            redis.hmset(REDIS_KEY_MAIL + offlineUser[count].uid, arrMail, function () {
                count++;
                callback();
            });
        },function(err){
            if(err){
                console.log("------fastMatchRankReward-----arrMail err: ",err);
            }
        });
    }
});

/**
 * 充值记录写入
 */
rpcServer.registerRemoteFunc('rechargeInsert', function(param, cb){
    ////充值记录写入
    console.log("-----------------rechargeInsert  param",param);
    console.log("-----------------param[0]",typeof (param[0]));
    console.log("-----------------param[1]",typeof (param[1]));
    //var recharge_date = COMM.timestamp();
    redis2mysql.RedisPushRecharge2([
        param[0]
        ,param[1]
        ,param[2]
        ,param[3]
    ],function (){
        //console.log("----------114-------------cb");
        rechargeList.processRecharge2(function (is){
            cb(null);
        });
    });
});

/**
 * 充值
 */
rpcServer.registerRemoteFunc('purchasePayment', function(param, cb){
    ////充值记录写入
    console.log("-----------------purchasePayment  param",param);
    var result = {productID: null, productType: null, productNum: null, err: 0};
    var user = session.getUserList[param[0]];
    //var bag = user.contMng.bag;
    if(user == undefined || user == null){
        result.err = 1;
        cb(1);
        return;
    }
    var productID = param[1];
    if(productID == undefined || productID == null){
        result.err = 2;
        user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
        cb(2);
        return;
    }
    var tid = param[2];
    if(tid == undefined || tid == null){
        result.err = 5;
        user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
        cb(5);
        return;
    }
    var currency = param[3];
    if(currency == undefined || currency == null){
        result.err = 8;
        user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
        cb(8);
        return;
    }
    var viplevel = user.getValue("vipLv")*1;
    var vipnumber = user.getValue("vipNumber")*1;
    var rechargecoefficient = user.getValue("rechargeCoefficient")*1;
    var costquota = user.getValue("costQuota")*1;
    var rmbNum = 0;
    var gem = user.getValue("gem")*1;
    var gold = user.getValue("gold")*1;
    var glory = user.getValue("glory") *1;
    var getPackage = user.getValue("getPackage")*1;
    var getOtherPackage1 = user.getValue("getOtherPackage1")*1;
    var getOtherPackage2 = user.getValue("getOtherPackage2")*1;
    var getOtherPackage3 = user.getValue("getOtherPackage3")*1;
    var getOtherPackage4 = user.getValue("getOtherPackage4")*1;
    var novicePackage = user.getValue("novicePackage");
    var _novicePackage = JSON.parse(novicePackage);

    var novicePackageTime = user.getValue("novicePackageTime")*1;
    var monthCard = user.getValue("monthCard")*1;
    var canGet = user.getValue("canGet")*1;
    var monthCardDate = user.getValue("monthCardDate")*1;
    var cardBoxPropRate = user.getValue("cardBoxPropRate")*1;
    var goldByPurchase = user.getValue("goldByPurchase")*1;
    var gemByPurchase = user.getValue("gemByPurchase")*1;
    var pid = productID;
    console.log('----------------------pid', pid);

    var productType = null;
    var productNum = 0;
    var gemCostNum = 0;
    if(currency == 'USD'){
        redis.lrange (REDIS_KEY_TID , 0,-1, function (err, reply) {
            console.log("-----------------purchasePayment  reply",reply);
            for(var k = 0;k < reply.length;k++){
                if(reply[k] == tid){
                    result.err = 4;
                    user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                    cb(4);
                    return;
                }
            }
            redis.lpush(REDIS_KEY_TID ,tid, function () {
                for (var key in mall_gold_En) {
                    if (mall_gold_En[key].product_id == pid) {
                        productType = 1; //金币
                        gem -= mall_gold_En[key].price*1;
                        gold += mall_gold_En[key].count*1;
                        productNum = mall_gold_En[key].count*1;
                        gemCostNum = mall_gold_En[key].price*-1;
                        goldByPurchase += mall_gold_En[key].count*1;
                    }
                }
                for (var key in mall_diamond_En) {
                    if (mall_diamond_En[key].product_id == pid) {
                        productType = 2; //钻石
                        gem += mall_diamond_En[key].count*1;
                        vipnumber += mall_diamond_En[key].price*1;
                        rmbNum += mall_diamond_En[key].price*1;
                        //productNum = mall_diamond_En[key].count*1;
                        productNum = 0;
                        gemCostNum = mall_diamond_En[key].count*1;
                        gemByPurchase += mall_diamond_En[key].count*1;
                    }
                }
                var addProp = function (key) {
                    var arr = [];
                    var arrGiftId = otherGift_En[key].prop_id.split('|');
                    var arrGiftNum = otherGift_En[key].count.split('|');
                    console.log("----------------arrGiftId",arrGiftId);
                    console.log("----------------arrGiftNum",arrGiftNum);
                    for(var i=0;i< arrGiftId.length;i++){
                        var g_prop = global.prop[arrGiftId[i]];
                        if(g_prop == undefined){ continue; }

                        if(arrGiftId[i] *1 == 1002){
                            gold += arrGiftNum[i]*1 || 0;
                            productNum = arrGiftNum[i]*1;
                        }
                        else if(arrGiftId[i] *1 == 1003){
                            gem += arrGiftNum[i]*1 || 0;
                            gemCostNum = arrGiftNum[i]*1;
                        }
                        else if(arrGiftId[i] *1 == 1004){
                            glory += arrGiftNum[i]*1 || 0;
                        }
                        else {
                            arr.push({id: arrGiftId[i]*1, type: g_prop.exchange_type*1, num: arrGiftNum[i]*1});
                        }
                    }
                    user.fillBag(arr);
                    productType = 3;
                    vipnumber += otherGift_En[key].price*1;
                    rmbNum += otherGift_En[key].price*1;
                }
                var addPropOfShouchong = function (key) {
                    var arr = [];
                    var arrGiftId = shouchong_En[key].prop_id.split('|');
                    var arrGiftNum = shouchong_En[key].count.split('|');
                    console.log("----------------arrGiftId",arrGiftId);
                    console.log("----------------arrGiftNum",arrGiftNum);
                    for(var i=0;i< arrGiftId.length;i++){
                        var g_prop = global.prop[arrGiftId[i]];
                        if(g_prop == undefined){ continue; }

                        if(arrGiftId[i] *1 == 1002){
                            gold += arrGiftNum[i]*1 || 0;
                            productNum = arrGiftNum[i]*1;
                        }
                        else if(arrGiftId[i] *1 == 1003){
                            gem += arrGiftNum[i]*1 || 0;
                            gemCostNum = arrGiftNum[i]*1;
                        }
                        else if(arrGiftId[i] *1 == 1004){
                            glory += arrGiftNum[i]*1 || 0;
                        }
                        else {
                            arr.push({id: arrGiftId[i]*1, type: g_prop.exchange_type*1, num: arrGiftNum[i]*1});
                        }
                    }
                    user.fillBag(arr);
                    productType = 3;
                    vipnumber += shouchong_En[key].price*1;
                    rmbNum += shouchong_En[key].price*1;
                }
                for (var key in shouchong_En) {
                    if (shouchong_En[key].product_id == pid&&shouchong_En[key].product_id =="com.cqgaming.fish.icepack660") {
                        console.log('----------------------_novicePackage.getShouchongPackage1',_novicePackage.getShouchongPackage1);
                        if(_novicePackage.getShouchongPackage1 == undefined||_novicePackage.getShouchongPackage1 == 1 ||_novicePackage.getShouchongPackage4 == 1){
                            result.err = 6;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(6);
                            return;
                        }
                        addPropOfShouchong(key);
                        _novicePackage.getShouchongPackage1 = 1;
                        if(novicePackageTime == 0){
                            user.setValue("novicePackageTime",Date.now());
                        }
                    }
                    if (shouchong_En[key].product_id == pid&&shouchong_En[key].product_id =="com.cqgaming.fish.icepack2160") {
                        if(_novicePackage.getShouchongPackage2 == undefined||_novicePackage.getShouchongPackage2 == 1 ||_novicePackage.getShouchongPackage4 == 1){
                            result.err = 6;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(6);
                            return;
                        }
                        addPropOfShouchong(key);
                        _novicePackage.getShouchongPackage2 = 1;
                        if(novicePackageTime == 0){
                            user.setValue("novicePackageTime",Date.now());
                        }
                    }
                    if (shouchong_En[key].product_id == pid&&shouchong_En[key].product_id =="com.cqgaming.fish.icepack3900") {
                        if(_novicePackage.getShouchongPackage3 == undefined||_novicePackage.getShouchongPackage3 == 1 ||_novicePackage.getShouchongPackage4 == 1){
                            result.err = 6;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(6);
                            return;
                        }
                        addPropOfShouchong(key);
                        _novicePackage.getShouchongPackage3 = 1;
                        if(novicePackageTime == 0){
                            user.setValue("novicePackageTime",Date.now());
                        }
                    }
                    if (shouchong_En[key].product_id == pid&&shouchong_En[key].product_id =="com.cqgaming.fish.icepack7500") {
                        if(_novicePackage.getShouchongPackage1 == 1 ||_novicePackage.getShouchongPackage2 == 1 ||_novicePackage.getShouchongPackage3 == 1||
                            _novicePackage.getShouchongPackage4 == undefined||_novicePackage.getShouchongPackage4 == 1){
                            result.err = 6;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(6);
                            return;
                        }
                        addPropOfShouchong(key);
                        _novicePackage.getShouchongPackage4 = 1;
                    }
                }
                //console.log('----------------------_novicePackage',_novicePackage);
                for (var key in giftPackage_En) {
                    if (giftPackage_En[key].product_id == pid && giftPackage_En[key].product_id =="com.cqgaming.fish.moonthpack") {
                        //console.log('----------------------guizu', giftPackage_En[key].product_id);
                        //第一次购买月卡
                        if(monthCard == 0){
                            user.setValue("monthCardDate", Date.now()+30*24*60*60*1000);
                            user.setValue("monthCard",30);
                            productType = 3;
                            cardBoxPropRate = global.other[1].box_rate *1;
                            vipnumber += giftPackage_En[key].price*1;
                            rmbNum += giftPackage_En[key].price*1;
                            productNum = 0;    //购买后获得的物品数量，无意义
                            user.setValue("canGet",1);
                        }else {
                            user.setValue("monthCardDate", monthCardDate+30*24*60*60*1000);
                            user.setValue("monthCard",monthCard+30);
                            productType = 3;
                            vipnumber += giftPackage_En[key].price*1;
                            rmbNum += giftPackage_En[key].price*1;
                        }

                    }
                }
                for (var key in otherGift_En) {
                    if (otherGift_En[key].product_id == pid&&otherGift_En[key].product_id =="com.cqgaming.fish.pack7820") {
                        if(getOtherPackage1 == 1){
                            result.err = 7;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(7);
                            return;
                        }
                        addProp(key);
                        user.setValue("getOtherPackage1",1);
                        user.setValue("timePackage1",Date.now());
                    }
                    if (otherGift_En[key].product_id == pid&&otherGift_En[key].product_id =="com.cqgaming.fish.pack15360") {
                        if(getOtherPackage2 == 1){
                            result.err = 7;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(7);
                            return;
                        }
                        addProp(key);
                        user.setValue("getOtherPackage2",1);
                        user.setValue("timePackage2",Date.now());
                    }
                    if (otherGift_En[key].product_id == pid&&otherGift_En[key].product_id =="com.cqgaming.fish.pack42640") {
                        if(getOtherPackage3 == 1){
                            result.err = 7;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(7);
                            return;
                        }
                        addProp(key);
                        user.setValue("getOtherPackage3",1);
                        user.setValue("timePackage3",Date.now());
                    }
                    if (otherGift_En[key].product_id == pid&&otherGift_En[key].product_id =="com.cqgaming.fish.pack97200") {
                        if(getOtherPackage4 == 1){
                            result.err = 7;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(7);
                            return;
                        }
                        addProp(key);
                        user.setValue("getOtherPackage4",1);
                        user.setValue("timePackage4",Date.now());
                        if(otherGift_En[key].skin_id*1 != 0){
                            var retNum = user.addUnlockSkin(otherGift_En[key].skin_id);
                            if(retNum < 0){
                                console.log('====> this skin id %d is err <=====', otherGift_En[key].skin_id);
                            }
                        }
                    }
                }

                if (productType == null) {
                    result.err = 3;
                    user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                    cb(3);
                    return;

                }


                ////充值记录写入
                /*if(rmbNum > 0){
                    var recharge_date = COMM.timestamp();
                    redis2mysql.RedisPushRechargeUpdate([
                        user.getValue('outsideUuid')
                        ,rmbNum
                        ,recharge_date
                        ,data.state
                        ,trade_no
                    ],function (){
                        rechargeList.processRechargeUpdate(function (is){
                        });
                    });
                }*/


                var newSkillId = 0;  ///解锁的技能ID
                for(var i = Object.keys(global.vip_En).length; i > 0; i--){
                    if(global.vip_En[i] != undefined && vipnumber >= global.vip_En[i].Price){
                        viplevel = i;
                        newSkillId = global.vip_En[i].skill_id;
                        break;
                    }
                }
                /// 是否达到解锁皮肤的等级
                var arrSkinID = global.getSkinIdByAct(viplevel);
                if(arrSkinID != undefined && arrSkinID.length > 0){
                    /// VIP等级有几率存在一次连升几级
                    var tempSkins = user.getValue('unlockSkins');
                    tempSkins = JSON.parse(tempSkins);
                    for(var a =0; a <arrSkinID.length; a++){
                        if(tempSkins[arrSkinID[a]] != undefined){
                            continue; /// 已经存在的无需再添加
                        }
                        var retNum = user.addUnlockSkin(arrSkinID[a]);
                        if(retNum < 0){
                            console.log('====> this skin id %d is err <=====', arrSkinID[a]);
                        }
                    }
                }

                /// 是否达到解锁狂暴技能的等级
                var retNum = user.setKuangBaoSkill(newSkillId);
                if(retNum < 0){
                    console.log('==Err==> this new skill id = <=====', newSkillId);
                }
                //console.log('==++++2222+++++==> curSkills ==== ', user.getValue('skills'), vipnumber, viplevel);

                //充值系数
                var info = [];
                for(var key in quota_En){
                    info.push(key);
                }

                for(var i = info.length-1; i >= 0; i--){
                    if(vipnumber >= info[i]*1){
                        rechargecoefficient = quota_En[info[i]].recharge_coefficient;
                        costquota = quota_En[info[i]].cost_quota;
                        break;
                    }

                }
                if(user.roomServerId != undefined && user.roomServerId != null){
                    user.rpcTrans('purchase', [productNum,gemCostNum,rechargecoefficient,costquota], function (err, ret) {
                    });
                }
                user.setValue("goldByPurchase",goldByPurchase);
                user.setValue("gemByPurchase",gemByPurchase);
                user.setValue("vipNumber",vipnumber);
                user.setValue("vipLv",viplevel);
                user.setValue("rechargeCoefficient",rechargecoefficient);
                user.setValue("costQuota",costquota);
                user.setValue("cardBoxPropRate",cardBoxPropRate);
                user.setValue("gem",gem);
                user.setValue("gold",gold);
                user.setValue("glory",glory);
                user.setValue("novicePackage",JSON.stringify(_novicePackage));

                result.productID = pid;
                result.productType = productType;
                result.productNum = productNum;
                //console.log("----------901-------------------------------result ",result);
                //活动
                if(rmbNum > 0){
                    activityMgr.recharge(user, rmbNum);
                }
                if(gemCostNum < 0){
                    activityMgr.costGem(user, gemCostNum*-1);
                }
                ////
                user.writeToDb(function(){});


                user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                cb();
            });

        });
    }else {
        redis.lrange (REDIS_KEY_TID , 0,-1, function (err, reply) {
            console.log("-----------------purchasePayment  reply",reply);
            for(var k = 0;k < reply.length;k++){
                if(reply[k] == tid){
                    result.err = 4;
                    user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                    cb(4);
                    return;
                }
            }
            redis.lpush(REDIS_KEY_TID ,tid, function () {

                for (var key in mall_gold) {
                    if (mall_gold[key].product_id == pid) {
                        productType = 1; //金币
                        gem -= mall_gold[key].price*1;
                        gold += mall_gold[key].count*1;
                        productNum = mall_gold[key].count*1;
                        gemCostNum = mall_gold[key].price*-1;
                        goldByPurchase += mall_gold[key].count*1;
                    }
                }
                for (var key in mall_diamond) {
                    if (mall_diamond[key].product_id == pid) {
                        productType = 2; //钻石
                        gem += mall_diamond[key].count*1;
                        vipnumber += mall_diamond[key].price*1;
                        rmbNum += mall_diamond[key].price*1;
                        //productNum = mall_diamond[key].count*1;
                        productNum = 0;
                        gemCostNum = mall_diamond[key].count*1;
                        gemByPurchase += mall_diamond[key].count*1;
                    }
                }
                var addProp = function (key) {
                    var arr = [];
                    var arrGiftId = otherGift[key].prop_id.split('|');
                    var arrGiftNum = otherGift[key].count.split('|');
                    console.log("----------------arrGiftId",arrGiftId);
                    console.log("----------------arrGiftNum",arrGiftNum);
                    for(var i=0;i< arrGiftId.length;i++){
                        var g_prop = global.prop[arrGiftId[i]];
                        if(g_prop == undefined){ continue; }

                        if(arrGiftId[i] *1 == 1002){
                            gold += arrGiftNum[i]*1 || 0;
                            productNum = arrGiftNum[i]*1;
                        }
                        else if(arrGiftId[i] *1 == 1003){
                            gem += arrGiftNum[i]*1 || 0;
                            gemCostNum = arrGiftNum[i]*1;
                        }
                        else if(arrGiftId[i] *1 == 1004){
                            glory += arrGiftNum[i]*1 || 0;
                        }
                        else {
                            arr.push({id: arrGiftId[i]*1, type: g_prop.exchange_type*1, num: arrGiftNum[i]*1});
                        }
                    }
                    user.fillBag(arr);
                    productType = 3;
                    vipnumber += otherGift[key].price*1;
                    rmbNum += otherGift[key].price*1;
                }
                var addPropOfShouchong = function (key) {
                    var arr = [];
                    var arrGiftId = shouchong[key].prop_id.split('|');
                    var arrGiftNum = shouchong[key].count.split('|');
                    console.log("----------------arrGiftId",arrGiftId);
                    console.log("----------------arrGiftNum",arrGiftNum);
                    for(var i=0;i< arrGiftId.length;i++){
                        var g_prop = global.prop[arrGiftId[i]];
                        if(g_prop == undefined){ continue; }

                        if(arrGiftId[i] *1 == 1002){
                            gold += arrGiftNum[i]*1 || 0;
                            productNum = arrGiftNum[i]*1;
                        }
                        else if(arrGiftId[i] *1 == 1003){
                            gem += arrGiftNum[i]*1 || 0;
                            gemCostNum = arrGiftNum[i]*1;
                        }
                        else if(arrGiftId[i] *1 == 1004){
                            glory += arrGiftNum[i]*1 || 0;
                        }
                        else {
                            arr.push({id: arrGiftId[i]*1, type: g_prop.exchange_type*1, num: arrGiftNum[i]*1});
                        }
                    }
                    user.fillBag(arr);
                    productType = 3;
                    vipnumber += shouchong[key].price*1;
                    rmbNum += shouchong[key].price*1;
                }
                for (var key in shouchong) {
                    if (shouchong[key].product_id == pid&&shouchong[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs660") {
                        console.log('----------------------_novicePackage.getShouchongPackage1',_novicePackage.getShouchongPackage1);
                        if(_novicePackage.getShouchongPackage1 == undefined||_novicePackage.getShouchongPackage1 == 1 ||_novicePackage.getShouchongPackage4 == 1){
                            result.err = 6;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(6);
                            return;
                        }
                        addPropOfShouchong(key);
                        _novicePackage.getShouchongPackage1 = 1;
                        if(novicePackageTime == 0){
                            user.setValue("novicePackageTime",Date.now());
                        }
                    }
                    if (shouchong[key].product_id == pid&&shouchong[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs2160") {
                        if(_novicePackage.getShouchongPackage2 == undefined||_novicePackage.getShouchongPackage2 == 1 ||_novicePackage.getShouchongPackage4 == 1){
                            result.err = 6;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(6);
                            return;
                        }
                        addPropOfShouchong(key);
                        _novicePackage.getShouchongPackage2 = 1;
                        if(novicePackageTime == 0){
                            user.setValue("novicePackageTime",Date.now());
                        }
                    }
                    if (shouchong[key].product_id == pid&&shouchong[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs3900") {
                        if(_novicePackage.getShouchongPackage3 == undefined||_novicePackage.getShouchongPackage3 == 1 ||_novicePackage.getShouchongPackage4 == 1){
                            result.err = 6;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(6);
                            return;
                        }
                        addPropOfShouchong(key);
                        _novicePackage.getShouchongPackage3 = 1;
                        if(novicePackageTime == 0){
                            user.setValue("novicePackageTime",Date.now());
                        }
                    }
                    if (shouchong[key].product_id == pid&&shouchong[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs7500") {
                        if(_novicePackage.getShouchongPackage1 == 1 ||_novicePackage.getShouchongPackage2 == 1 ||_novicePackage.getShouchongPackage3 == 1||
                            _novicePackage.getShouchongPackage4 == undefined||_novicePackage.getShouchongPackage4 == 1){
                            result.err = 6;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(6);
                            return;
                        }
                        addPropOfShouchong(key);
                        _novicePackage.getShouchongPackage4 = 1;
                    }
                }
                //console.log('----------------------_novicePackage',_novicePackage);
                for (var key in giftPackage) {
                    if (giftPackage[key].product_id == pid && giftPackage[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs30") {
                        //console.log('----------------------guizu', giftPackage[key].product_id);
                        //第一次购买月卡
                        if(monthCard == 0){
                            user.setValue("monthCardDate", Date.now()+30*24*60*60*1000);
                            user.setValue("monthCard",30);
                            productType = 3;
                            cardBoxPropRate = global.other[1].box_rate *1;
                            vipnumber += giftPackage[key].price*1;
                            rmbNum += giftPackage[key].price*1;
                            productNum = 0;    //购买后获得的物品数量，无意义
                            user.setValue("canGet",1);
                        }else {
                            user.setValue("monthCardDate", monthCardDate+30*24*60*60*1000);
                            user.setValue("monthCard",monthCard+30);
                            productType = 3;
                            vipnumber += giftPackage[key].price*1;
                            rmbNum += giftPackage[key].price*1;
                        }

                    }
                }
                for (var key in otherGift) {
                    if (otherGift[key].product_id == pid&&otherGift[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs7820") {
                        if(getOtherPackage1 == 1){
                            result.err = 7;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(7);
                            return;
                        }
                        addProp(key);
                        user.setValue("getOtherPackage1",1);
                        user.setValue("timePackage1",Date.now());
                    }
                    if (otherGift[key].product_id == pid&&otherGift[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs15360") {
                        if(getOtherPackage2 == 1){
                            result.err = 7;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(7);
                            return;
                        }
                        addProp(key);
                        user.setValue("getOtherPackage2",1);
                        user.setValue("timePackage2",Date.now());
                    }
                    if (otherGift[key].product_id == pid&&otherGift[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs42640") {
                        if(getOtherPackage3 == 1){
                            result.err = 7;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(7);
                            return;
                        }
                        addProp(key);
                        user.setValue("getOtherPackage3",1);
                        user.setValue("timePackage3",Date.now());
                    }
                    if (otherGift[key].product_id == pid&&otherGift[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs97200") {
                        if(getOtherPackage4 == 1){
                            result.err = 7;
                            user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                            cb(7);
                            return;
                        }
                        addProp(key);
                        user.setValue("getOtherPackage4",1);
                        user.setValue("timePackage4",Date.now());
                        if(otherGift[key].skin_id*1 != 0){
                            var retNum = user.addUnlockSkin(otherGift[key].skin_id);
                            if(retNum < 0){
                                console.log('====> this skin id %d is err <=====', otherGift[key].skin_id);
                            }
                        }
                    }
                }

                if (productType == null) {
                    result.err = 3;
                    user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                    cb(3);
                    return;

                }


                ////充值记录写入
                /*if(rmbNum > 0){
                 var recharge_date = COMM.timestamp();
                 redis2mysql.RedisPushRechargeUpdate([
                 user.getValue('outsideUuid')
                 ,rmbNum
                 ,recharge_date
                 ,data.state
                 ,trade_no
                 ],function (){
                 rechargeList.processRechargeUpdate(function (is){
                 });
                 });
                 }*/


                var newSkillId = 0;  ///解锁的技能ID
                for(var i = Object.keys(global.vip).length; i > 0; i--){
                    if(global.vip[i] != undefined && vipnumber >= global.vip[i].Price){
                        viplevel = i;
                        newSkillId = global.vip[i].skill_id;
                        //vipnumerator = vipnumber - vip[i].Price;
                        break;
                    }
                }
                /// 是否达到解锁皮肤的等级
                var arrSkinID = global.getSkinIdByAct(viplevel);
                if(arrSkinID != undefined && arrSkinID.length > 0){
                    /// VIP等级有几率存在一次连升几级
                    var tempSkins = user.getValue('unlockSkins');
                    tempSkins = JSON.parse(tempSkins);
                    for(var a =0; a <arrSkinID.length; a++){
                        if(tempSkins[arrSkinID[a]] != undefined){
                            continue; /// 已经存在的无需再添加
                        }
                        var retNum = user.addUnlockSkin(arrSkinID[a]);
                        if(retNum < 0){
                            console.log('====> this skin id %d is err <=====', arrSkinID[a]);
                        }
                    }
                }

                /// 是否达到解锁狂暴技能的等级
                var retNum = user.setKuangBaoSkill(newSkillId);
                if(retNum < 0){
                    console.log('==Err==> this new skill id = <=====', newSkillId);
                }
                //console.log('==++++2222+++++==> curSkills ==== ', user.getValue('skills'), vipnumber, viplevel);

                //充值系数
                var info = [];
                for(var key in quota){
                    info.push(key);
                }

                for(var i = info.length-1; i >= 0; i--){
                    if(vipnumber >= info[i]*1){
                        rechargecoefficient = quota[info[i]].recharge_coefficient;
                        costquota = quota[info[i]].cost_quota;
                        break;
                    }

                }
                if(user.roomServerId != undefined && user.roomServerId != null){
                    user.rpcTrans('purchase', [productNum,gemCostNum,rechargecoefficient,costquota], function (err, ret) {
                    });
                }
                user.setValue("goldByPurchase",goldByPurchase);
                user.setValue("gemByPurchase",gemByPurchase);
                user.setValue("vipNumber",vipnumber);
                user.setValue("vipLv",viplevel);
                user.setValue("rechargeCoefficient",rechargecoefficient);
                user.setValue("costQuota",costquota);
                user.setValue("cardBoxPropRate",cardBoxPropRate);
                user.setValue("gem",gem);
                user.setValue("gold",gold);
                user.setValue("glory",glory);
                user.setValue("novicePackage",JSON.stringify(_novicePackage));

                result.productID = pid;
                result.productType = productType;
                result.productNum = productNum;
                //console.log("----------901-------------------------------result ",result);
                //活动
                if(rmbNum > 0){
                    activityMgr.recharge(user, rmbNum);
                }
                if(gemCostNum < 0){
                    activityMgr.costGem(user, gemCostNum*-1);
                }
                ////
                user.writeToDb(function(){});


                user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                cb();
            });

        });
    }





});

/**
 *联通支付校验发放商品
*/
rpcServer.registerRemoteFunc('purchaseUnipay', function(param, cb){
    var result = {productID: null, productType: null, productNum: null, err: 0};
    var user = session.getUserList[param[0]];
    //var bag = user.contMng.bag;
    if(user == undefined || user == null){
        result.err = 1;
        cb(1);
        return;
    }

    addProduction(user,param[1],result,cb);

});
/**
 *商品发放
 */
var addProduction = function (user,productId,result,cb) {
    console.log("------------------------productId",productId);
    var productID = productId;
    if(productID == undefined || productID == null){
        result.err = 2;
        user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
        cb(2);
        return;
    }

    var viplevel = user.getValue("vipLv")*1;
    var vipnumber = user.getValue("vipNumber")*1;
    var rechargecoefficient = user.getValue("rechargeCoefficient")*1;
    var costquota = user.getValue("costQuota")*1;
    var rmbNum = 0;
    var gem = user.getValue("gem")*1;
    var gold = user.getValue("gold")*1;
    var glory = user.getValue("glory") *1;
    var getPackage = user.getValue("getPackage")*1;
    var getOtherPackage1 = user.getValue("getOtherPackage1")*1;
    var getOtherPackage2 = user.getValue("getOtherPackage2")*1;
    var getOtherPackage3 = user.getValue("getOtherPackage3")*1;
    var getOtherPackage4 = user.getValue("getOtherPackage4")*1;
    var novicePackage = user.getValue("novicePackage");
    var _novicePackage = JSON.parse(novicePackage);

    var novicePackageTime = user.getValue("novicePackageTime")*1;
    var monthCard = user.getValue("monthCard")*1;
    var canGet = user.getValue("canGet")*1;
    var monthCardDate = user.getValue("monthCardDate")*1;
    var cardBoxPropRate = user.getValue("cardBoxPropRate")*1;
    var goldByPurchase = user.getValue("goldByPurchase")*1;
    var gemByPurchase = user.getValue("gemByPurchase")*1;
    var pid = productID;
    console.log('----------------------pid', pid);

    var productType = null;
    var productNum = 0;
    var gemCostNum = 0;
    for (var key in mall_gold) {
        if (mall_gold[key].product_id == pid) {
            productType = 1; //金币
            gem -= mall_gold[key].price*1;
            gold += mall_gold[key].count*1;
            productNum = mall_gold[key].count*1;
            gemCostNum = mall_gold[key].price*-1;
            goldByPurchase += mall_gold[key].count*1;
        }
    }
    for (var key in mall_diamond) {
        if (mall_diamond[key].product_id == pid) {
            productType = 2; //钻石
            gem += mall_diamond[key].count*1;
            vipnumber += mall_diamond[key].price*1;
            rmbNum += mall_diamond[key].price*1;
            //productNum = mall_diamond[key].count*1;
            productNum = 0;
            gemCostNum = mall_diamond[key].count*1;
            gemByPurchase += mall_diamond[key].count*1;
        }
    }
    var addProp = function (key) {
        var arr = [];
        var arrGiftId = otherGift[key].prop_id.split('|');
        var arrGiftNum = otherGift[key].count.split('|');
        console.log("----------------arrGiftId",arrGiftId);
        console.log("----------------arrGiftNum",arrGiftNum);
        for(var i=0;i< arrGiftId.length;i++){
            var g_prop = global.prop[arrGiftId[i]];
            if(g_prop == undefined){ continue; }

            if(arrGiftId[i] *1 == 1002){
                gold += arrGiftNum[i]*1 || 0;
                productNum = arrGiftNum[i]*1;
            }
            else if(arrGiftId[i] *1 == 1003){
                gem += arrGiftNum[i]*1 || 0;
                gemCostNum = arrGiftNum[i]*1;
            }
            else if(arrGiftId[i] *1 == 1004){
                glory += arrGiftNum[i]*1 || 0;
            }
            else {
                arr.push({id: arrGiftId[i]*1, type: g_prop.exchange_type*1, num: arrGiftNum[i]*1});
            }
        }
        user.fillBag(arr);
        productType = 3;
        vipnumber += otherGift[key].price*1;
        rmbNum += otherGift[key].price*1;
    }
    var addPropOfShouchong = function (key) {
        var arr = [];
        var arrGiftId = shouchong[key].prop_id.split('|');
        var arrGiftNum = shouchong[key].count.split('|');
        console.log("----------------arrGiftId",arrGiftId);
        console.log("----------------arrGiftNum",arrGiftNum);
        for(var i=0;i< arrGiftId.length;i++){
            var g_prop = global.prop[arrGiftId[i]];
            if(g_prop == undefined){ continue; }

            if(arrGiftId[i] *1 == 1002){
                gold += arrGiftNum[i]*1 || 0;
                productNum = arrGiftNum[i]*1;
            }
            else if(arrGiftId[i] *1 == 1003){
                gem += arrGiftNum[i]*1 || 0;
                gemCostNum = arrGiftNum[i]*1;
            }
            else if(arrGiftId[i] *1 == 1004){
                glory += arrGiftNum[i]*1 || 0;
            }
            else {
                arr.push({id: arrGiftId[i]*1, type: g_prop.exchange_type*1, num: arrGiftNum[i]*1});
            }
        }
        user.fillBag(arr);
        productType = 3;
        vipnumber += shouchong[key].price*1;
        rmbNum += shouchong[key].price*1;
    }
    for (var key in shouchong) {
        if (shouchong[key].product_id == pid&&shouchong[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs660") {
            console.log('----------------------_novicePackage.getShouchongPackage1',_novicePackage.getShouchongPackage1);
            if(_novicePackage.getShouchongPackage1 == undefined||_novicePackage.getShouchongPackage1 == 1 ||_novicePackage.getShouchongPackage4 == 1){
                result.err = 6;
                user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                cb(6);
                return;
            }
            addPropOfShouchong(key);
            _novicePackage.getShouchongPackage1 = 1;
            if(novicePackageTime == 0){
                user.setValue("novicePackageTime",Date.now());
            }
        }
        if (shouchong[key].product_id == pid&&shouchong[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs2160") {
            if(_novicePackage.getShouchongPackage2 == undefined||_novicePackage.getShouchongPackage2 == 1 ||_novicePackage.getShouchongPackage4 == 1){
                result.err = 6;
                user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                cb(6);
                return;
            }
            addPropOfShouchong(key);
            _novicePackage.getShouchongPackage2 = 1;
            if(novicePackageTime == 0){
                user.setValue("novicePackageTime",Date.now());
            }
        }
        if (shouchong[key].product_id == pid&&shouchong[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs3900") {
            if(_novicePackage.getShouchongPackage3 == undefined||_novicePackage.getShouchongPackage3 == 1 ||_novicePackage.getShouchongPackage4 == 1){
                result.err = 6;
                user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                cb(6);
                return;
            }
            addPropOfShouchong(key);
            _novicePackage.getShouchongPackage3 = 1;
            if(novicePackageTime == 0){
                user.setValue("novicePackageTime",Date.now());
            }
        }
        if (shouchong[key].product_id == pid&&shouchong[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs7500") {
            if(_novicePackage.getShouchongPackage1 == 1 ||_novicePackage.getShouchongPackage2 == 1 ||_novicePackage.getShouchongPackage3 == 1||
                _novicePackage.getShouchongPackage4 == undefined||_novicePackage.getShouchongPackage4 == 1){
                result.err = 6;
                user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                cb(6);
                return;
            }
            addPropOfShouchong(key);
            _novicePackage.getShouchongPackage4 = 1;
        }
    }
    //console.log('----------------------_novicePackage',_novicePackage);
    for (var key in giftPackage) {
        if (giftPackage[key].product_id == pid && giftPackage[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs30") {
            //console.log('----------------------guizu', giftPackage[key].product_id);
            //第一次购买月卡
            if(monthCard == 0){
                user.setValue("monthCardDate", Date.now()+30*24*60*60*1000);
                user.setValue("monthCard",30);
                productType = 3;
                cardBoxPropRate = global.other[1].box_rate *1;
                vipnumber += giftPackage[key].price*1;
                rmbNum += giftPackage[key].price*1;
                productNum = 0;    //购买后获得的物品数量，无意义
                user.setValue("canGet",1);
            }else {
                user.setValue("monthCardDate", monthCardDate+30*24*60*60*1000);
                user.setValue("monthCard",monthCard+30);
                productType = 3;
                vipnumber += giftPackage[key].price*1;
                rmbNum += giftPackage[key].price*1;
            }

        }
    }
    for (var key in otherGift) {
        if (otherGift[key].product_id == pid&&otherGift[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs7820") {
            if(getOtherPackage1 == 1){
                result.err = 7;
                user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                cb(7);
                return;
            }
            addProp(key);
            user.setValue("getOtherPackage1",1);
            user.setValue("timePackage1",Date.now());
        }
        if (otherGift[key].product_id == pid&&otherGift[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs15360") {
            if(getOtherPackage2 == 1){
                result.err = 7;
                user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                cb(7);
                return;
            }
            addProp(key);
            user.setValue("getOtherPackage2",1);
            user.setValue("timePackage2",Date.now());
        }
        if (otherGift[key].product_id == pid&&otherGift[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs42640") {
            if(getOtherPackage3 == 1){
                result.err = 7;
                user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                cb(7);
                return;
            }
            addProp(key);
            user.setValue("getOtherPackage3",1);
            user.setValue("timePackage3",Date.now());
        }
        if (otherGift[key].product_id == pid&&otherGift[key].product_id =="com.ckaiyou.aiyoubuyu.iap.packs97200") {
            if(getOtherPackage4 == 1){
                result.err = 7;
                user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
                cb(7);
                return;
            }
            addProp(key);
            user.setValue("getOtherPackage4",1);
            user.setValue("timePackage4",Date.now());
            if(otherGift[key].skin_id*1 != 0){
                var retNum = user.addUnlockSkin(otherGift[key].skin_id);
                if(retNum < 0){
                    console.log('====> this skin id %d is err <=====', otherGift[key].skin_id);
                }
            }
        }
    }

    if (productType == null) {
        result.err = 3;
        user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
        cb(3);
        return;

    }


    ////充值记录写入
    /*if(rmbNum > 0){
     var recharge_date = COMM.timestamp();
     redis2mysql.RedisPushRechargeUpdate([
     user.getValue('outsideUuid')
     ,rmbNum
     ,recharge_date
     ,data.state
     ,trade_no
     ],function (){
     rechargeList.processRechargeUpdate(function (is){
     });
     });
     }*/


    var newSkillId = 0;  ///解锁的技能ID
    for(var i = Object.keys(global.vip).length; i > 0; i--){
        if(global.vip[i] != undefined && vipnumber >= global.vip[i].Price){
            viplevel = i;
            newSkillId = global.vip[i].skill_id;
            //vipnumerator = vipnumber - vip[i].Price;
            break;
        }
    }
    /// 是否达到解锁皮肤的等级
    var arrSkinID = global.getSkinIdByAct(viplevel);
    if(arrSkinID != undefined && arrSkinID.length > 0){
        /// VIP等级有几率存在一次连升几级
        var tempSkins = user.getValue('unlockSkins');
        tempSkins = JSON.parse(tempSkins);
        for(var a =0; a <arrSkinID.length; a++){
            if(tempSkins[arrSkinID[a]] != undefined){
                continue; /// 已经存在的无需再添加
            }
            var retNum = user.addUnlockSkin(arrSkinID[a]);
            if(retNum < 0){
                console.log('====> this skin id %d is err <=====', arrSkinID[a]);
            }
        }
    }

    /// 是否达到解锁狂暴技能的等级
    var retNum = user.setKuangBaoSkill(newSkillId);
    if(retNum < 0){
        console.log('==Err==> this new skill id = <=====', newSkillId);
    }
    //console.log('==++++2222+++++==> curSkills ==== ', user.getValue('skills'), vipnumber, viplevel);

    //充值系数
    var info = [];
    for(var key in quota){
        info.push(key);
    }

    for(var i = info.length-1; i >= 0; i--){
        if(vipnumber >= info[i]*1){
            rechargecoefficient = quota[info[i]].recharge_coefficient;
            costquota = quota[info[i]].cost_quota;
            break;
        }

    }
    if(user.roomServerId != undefined && user.roomServerId != null){
        user.rpcTrans('purchase', [productNum,gemCostNum,rechargecoefficient,costquota], function (err, ret) {
        });
    }
    user.setValue("goldByPurchase",goldByPurchase);
    user.setValue("gemByPurchase",gemByPurchase);
    user.setValue("vipNumber",vipnumber);
    user.setValue("vipLv",viplevel);
    user.setValue("rechargeCoefficient",rechargecoefficient);
    user.setValue("costQuota",costquota);
    user.setValue("cardBoxPropRate",cardBoxPropRate);
    user.setValue("gem",gem);
    user.setValue("gold",gold);
    user.setValue("glory",glory);
    user.setValue("novicePackage",JSON.stringify(_novicePackage));

    result.productID = pid;
    result.productType = productType;
    result.productNum = productNum;
    //console.log("----------901-------------------------------result ",result);
    //活动
    if(rmbNum > 0){
        activityMgr.recharge(user, rmbNum);
    }
    if(gemCostNum < 0){
        activityMgr.costGem(user, gemCostNum*-1);
    }
    ////
    user.writeToDb(function(){});


    user.sendMsg(NID.NI_SC_PURCH_PRODUCT, result);
    cb();
}
/**
 * transfer server 转发回来的消息
 * 用户登录后查看用户信息，在线则RPC消息通T掉老数据
 */
rpcServer.registerRemoteFunc('kickUser', function(uid, cb){
    var _user = session.getUser(uid);
    if(_user){
        _user.release(cb);
    }else{
        cb();
    }
});


/**
 * 强制用户下载，房间中超时踢人
 */
rpcServer.registerRemoteFunc('rpc_handler', function(pid,uid,param,cb){
   
    param.session = session;
    param.uid = uid;
    //param [0, uid, 1, pid, 2param]

    //console.log("================== rpc handler =" , uid, pid);
    rpcMgr.trigger(pid, uid, param, cb);
});

/**
 * GM told online players after the modification of signData & signTotalData.
 * dataType = "signData" | "signTotalData"
 * data = {1:{},2:{},...}
 */
rpcServer.registerRemoteFunc('sendSignDataToOnlineUsers', function(dataType, data, cb){
    if(dataType == undefined || data == undefined){
        cb(1,null);return;
    }
    var tempSignData = [];
    var tempTotalSignData = [];
    for(var dKey in data){
        if(dataType == "signData") {
            tempSignData.push(data[dKey]);
        }else if(dataType == "signTotalData") {
            tempTotalSignData.push(data[dKey]);
        }
    }
    if(dataType == "signTotalData" && data != undefined) {
        global.totalSignInfo = data;  /// 覆盖当月累计签到奖励的内存数据
        //console.log("----> totalSignInfo = ", global.totalSignInfo);
    }
    else if(dataType == "signData" && data != undefined){
        global.signInfo = data;  /// 覆盖当月签到的内存数据
        //console.log("----> signInfo = ", global.signInfo);
    }
    for(var sKey in session.getUserList){
        var userData = session.getUserList[sKey];
        if(userData == undefined){
            continue;
        }
        userData.sendMsg(NID.NI_SC_PUSH_SIGN_DATA,{signData: tempSignData ,signTotalData: tempTotalSignData});
        /// 更新后重置玩家的signDataChange字段
        userData.setValue("signDataIsChange",global.signDataIsChange);
    }
    cb(null, 0);
});
rpcServer.createServer(RPC_SOCKET);
var server = net.createServer(function (conn) {
    conn._msgBuffer = null;
    session.newSession(conn);

    var refreshTimeout = setInterval(function () {
        session.resetExpire(conn._sid);
    }, 1800 * 1000);


    conn.on("data", function (data) {
        //console.log(data);
        //收到data后进行解包
        if (Buffer.isBuffer(data)) {
            if (conn._msgBuffer != null) {
                //先拼接上一次剩余的消息
                data = Buffer.concat([conn._msgBuffer, data], conn._msgBuffer.length + data.length);
                conn._msgBuffer = null;
            }
            while (true) {
                //循环处理剩余消息(每次都处理干净）
                if (data == null || data.length < 2) {
                    //连长度都没有 直接返回
                    conn._msgBuffer = data;
                    return;
                }
                var packageLength = data.readUInt16BE(0); //获取了包长度
                if (data.length < packageLength + LENGTH_BYTE) {
                    //半包
                    conn._msgBuffer = data;
                    return;
                }
                var packageID = data.readUInt32BE(LENGTH_BYTE); // 获取了包ID

                var packageData = data.slice(LENGTH_BYTE + PACKAGE_ID_BYTE, LENGTH_BYTE + parseInt(packageLength)); //切掉长度+ID的头
                if (data.length > packageLength + LENGTH_BYTE) {
                    //粘包循环处理 直到半包或者处理完毕
                    data = data.slice(LENGTH_BYTE + parseInt(packageLength));
                } else {
                    data = null;
                }
                var parsedData = dataParser.parse(packageID, packageData);
                //console.log("process packet = %s, data=%s" ,  packageID, JSON.stringify(parsedData));


                //消息处理
                //router.processRequest(conn._sid, conn._uid, packageID, parsedData, function (err, packetId, protoName, jsonData) {
                //    //有callback调用则表示是request消息 需要向客户端返回结果
                //    //err是错误码 result是json格式的结果 目前纯数字的消息模式使用pid
                //    var data = dataParser.buildProtoMsg(packetId, protoName, jsonData);
                //    conn.write(data);
                //});
                var getUser = function(){
                    return session.getUser(conn._uid);
                };

                //检测用户是否存在
                var checkOnline = function(cb){
                    //禁用
                    var u = session.getUser(conn._uid);
                    if(u){
                        cb();
                    }
                    else{
                        if(packageID == NID.NI_CS_LOGIN){
                            cb();
                            return;
                        }

                        /*var ObjUser = require('../obj/ObjUser');
                        var user = new ObjUser();
                        user.setUid(uid);
                        user.bindConn(param.conn);
                        user.loadFromDb(function(err, info) {
                            if (session.setUser(uid, user)) {
                                user.setUid(conn._uid);
                                user.bindConn(conn);
                                session.setUid(user);
                                console.log("--------------------------------------------------------------");
                                cb();
                            }
                        });*/
                        cb();
                    }
                }

                //checkOnline(function(){
                    //console.log("packet ---------id =  "+ packageID);
                    try
                    {
                        handlerMgr.trigger(packageID,
                            {conn:conn, data:parsedData, session:session, /*router:router,*/ user:getUser},
                            function (err, packetId, jsonData) {
                                //有callback调用则表示是request消息 需要向客户端返回结果
                                //err是错误码 result是json格式的结果 目前纯数字的消息模式使用pid
                                if(err){
                                    //console.log("packet error paicketid = "+ packetId);
                                }
                                //console.log("paicketid = %s, values =%s", packetId, JSON.stringify(jsonData));
                                var buf = dataParser.buildProtoMsg(packetId, null, jsonData);
                                conn.write(buf);

                                var u = getUser();
                                if(u){
                                    u.countData(buf.length);
                                    //logger.debug(" "+ conn._sid + " = "+ u.totalConnData);
                                    //var logger = require("../common/logHelper").helper;
                                    //logger.info("" + JSON.stringify(jsonData));
                                }

                            }
                        );
                    }
                    catch(e)
                    {
                        logger.err('front server msg:' + e.stack || e.message);
                    };

                //});
            }
        } else {
            //String
        }
    });
    conn.on("close", function () {
        //需要释放的东西放到这里
        //logger.trace("close uid = "+ conn._sid);
        console.log("===>conn.on(close) close conn._sid = "+ conn._sid);
        clearInterval(refreshTimeout);
        session.deleteSession(conn._sid);
    });

    conn.on('disconnect', function (){
        console.log("===> disconnect");
    });

    conn.on("error", function () {
        logger.err("close err = "+ conn._sid + ", _uid = " + conn._uid);
        clearInterval(refreshTimeout);
        session.deleteSession(conn._sid);
        console.log(" ************ front server socket error");
        //暂时无视
    });
});

server.listen(SOCKET_PORT, function () {
    console.log("front socket server listen on port " + SOCKET_PORT);
});

process.on('SIGTERM', function() {
    // todo sth
    console.log("--------------------------------- process close -----------------" + SOCKET_PORT);
    process.exit(0);
});

process.on('uncaughtException', function (err) {
    //打印出错误
    logger.err(err.stack || err.message);
});


require("../util/SetupServer.js")(serverId, redis, rpcManager,
    function (rType) {
        for (var i = 0; i < DEPENDENCIES_SERVERS.length; i++) {
            if (rType === DEPENDENCIES_SERVERS[i]) {
                return true;
            }
        }
        return false;
    }, MASTER_INFO);