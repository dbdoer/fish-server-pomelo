"use strict";
/**
 * Created by ck01-441 on 2016/2/27.
 * 逻辑处理模块
 * data已经经过parse
 */

//var timingAward = require('../Resources/timingaward.json').timingaward;
var mall_gold = require('../Resources/gold');
var mall_diamond = require('../Resources/diamond');
var loginReward = require('../Resources/registeraward').register;
var skinConfigManager = require('../Resources/weapon/SkinConfigManager');
var COMM = require('../common/commons');
var uuid = require("uuid");

var tblTimeAward = require('../Resources/TimeAward');
var loginAward = require('../Resources/loginreward');

var logger = require("../common/logHelper").helper;

var Player = require("../FastMatchServer/Player");

var mods = {};
var session;
var rpcManager;
var redis;

var KICKOFF_TIMEOUT = 5000;

var DEFAULT_UNLOCKED_SCENE = 1030101;
var DEFAULT_WEAPON_TYPE = 1010101;

var REDIS_KEY_TIME_REWARD = "fish4timeReward"; //定时领奖的key
var REDIS_KEY_LOGIN_REWARD = "fish4loginreward:";//签到
var REDIS_KEY_USER_INFO = "fish4user:";//用户信息记录
var REDIS_KEY_ONLINE_USER_LIST = "fish4online_users:";//在线用户列表
var REDIS_KEY_ONLINE_USER = "fish4online_user:";//在线用户
var REDIS_KEY_MAIL = "fish4mail:";// mail

var SESSION_FIELD_ROOM_ID = "roomId"; //session field room id

var testPlayerInfo = {};  ///临时存储玩家信息
var playerList = {};
function nop() {
}

//并没有在使用的id 用来测试
mods["100"] = function (sid, uid, data, cb) {
};

//实际上是拉取用户信息
mods["101"] = function (sid, uid, data, cb) {

    var response = {}; //返回给client的用户信息

    console.log("+++mods[101] ===>data = ", data);
    var errUserInfo = {
        uid: 0, gold: 0, gem: 0, clover: 0,
        energy: 0, name: "", pos: 0, headurl: "",
        weaponId: 0, optimalComScore: 0, weaponMaxLevel: 0
    };
    uid = data.uid;

    if (!uid) {
        cb(null, 4101, 'SC_Login', {code: 1, userInfo: errUserInfo});
        return;
    }

    //验证登录超时(超时后记录会被删除 目前是5000ms)
    if (!global.loginuuid[uid]) {
        cb(null, 4101, 'SC_Login', {code: 2, userInfo: errUserInfo});
        //log.info("uuid not exist:" + JSON.stringify(data));
        return;
    }

    //验证唯一性
    if (global.loginuuid[uid].uuid != data.uuid) {
        cb(null, 4101, 'SC_Login', {code: 3, userInfo: errUserInfo});
        //log.info("uuid not match:" + JSON.stringify(data));
        return;
    }

    //console.log("+++mods[101] ===>data = ", data);
    session.setUid(sid, data.uid); //在session中设置uid(添加到conn中)

    //清除等待登录记录
    clearTimeout(global.loginuuid[uid].timer);
    delete global.loginuuid[uid];

    redis.hgetall(REDIS_KEY_USER_INFO + uid, function (err, obj) {
        //console.log("+++mods[101] ===>gold = ", obj.gold);
        if (err || !obj) {
            //没有记录或者redis出现 错误而没有获得数据
            //log.info("uid not exist:" + JSON.stringify(data));
            return cb(null, 4101, 'SC_Login', {
                code: 4,
                userInfo: {uid: 0, gold: 0, gem: 0, clover: 0, energy: 0, name: "", pos: 0}
            });
        }

        response = formatUserInfo(obj, uid);
        testPlayerInfo = response;
        if(testPlayerInfo.mailList == undefined){
            testPlayerInfo.mailList = {};
            redis.hgetall(REDIS_KEY_MAIL + uid, function (err, obj) {
                if(err){
                    return;
                }
                if(obj != undefined && Object.keys(obj).length > 0){
                    var info = [];
                    for(var key in obj){
                        info.push(JSON.parse(obj[key]));
                    }

                    /// 根据创建邮件时的时间进行刷选 start
                    for(var i =0; i< info.length; i++){
                        if(Number(info[i].createTime) + 15 *24 *3600 < COMM.timestamp()){
                            info.splice(i, 1);  ///超过时间则删除
                            i--;continue;
                        }
                        testPlayerInfo.mailList[info[i].id] = info[i];
                    }
                }
                var messageObj = {code: 0, userInfo: response};
                //console.log("+++mods[101] ===>messageObj = ",JSON.stringify(messageObj));
                cb(null, 4101, 'SC_Login', messageObj);
                //log.info(" SC_Login :::::: " + JSON.stringify(messageObj));

                //登陆成功 通知redis
                redis.set(REDIS_KEY_ONLINE_USER + uid, global.serverId);
            })
        }
    })
};

//修改用户昵称
mods["102"] = function (sid, uid, data, cb) {
    //TODO 写入redis
    //data.newNickname;
    //console.log('mods["102"]=>data==>>: ',sid,uid,data);
    if(data){
        cb(null, 4102, "SC_ModifyNickName", {code: 0, newNickname: data.newNickname});
    }else{
        cb(null, 4102, "SC_ModifyNickName", {code: 0, newNickname: "NickNameFailed"});
    }

};

//修改头像
mods["103"] = function (sid, uid, data, cb) {
    //this.headImage = json.newHeadUrl;
    cb(null, 4103, "SC_ModifyHeadUrl", {code: 0, newHeadUrl: data.newHeadUrl});

};

//获取邮件信息
mods["104"] = function (sid, uid, data, cb) {

    console.log("-----mods[104]==>data: ", data);
    if(testPlayerInfo.mailList == undefined){
        //console.log("-----mods[104]==>mailList: ", testPlayerInfo.mailList);
        cb(null, 4104, "SC_Mail_List", {mailList:[]});
        return;
    }else{
        var info = [];
        for(var key in testPlayerInfo.mailList){
            info.push(testPlayerInfo.mailList[key]);
        }
        //console.log("----------104 ---2 ", info);
        cb(null, 4104, "SC_Mail_List", {mailList:info});
    }
};
//查看邮件
mods["105"] = function (sid, uid, data, cb) {

    console.log("-----mods[105]==>data: ", data);
    var resClient = {err: 0, result: 0};
    if(data == undefined || data.id == undefined){
        resClient.err = 1;
        cb(null, 4105, "SC_Mail_Check", resClient);return;
    }
    var mailId = data.id *1;
    redis.hgetall(REDIS_KEY_MAIL + uid, function (err, objMail) {
        if(err || objMail == undefined){
            resClient.err = 20;
            cb(null, 4105, "SC_Mail_Check", resClient);return;
        }

        var mailInfo = testPlayerInfo.mailList[mailId];
        var isNewMail = false;
        /// 判断邮件ID是否存在
        if(mailInfo == undefined){
            mailInfo = JSON.parse(objMail[mailId]);
            if(mailInfo == null || mailInfo == undefined){
                resClient.err = 2;
                cb(null, 4105, "SC_Mail_Check", resClient);return;
            }
            isNewMail = true;
        }

        /// 判断是否已读
        if (mailInfo.state > 1) {
            resClient.err = 3;
            cb(null, 4105, "SC_Mail_Check", resClient);
            return;
        }

        mailInfo.state = 2;
        if(isNewMail == true){ ///是新邮件才加入到内存中
             testPlayerInfo.mailList[mailId] = mailInfo;
        }
        resClient.result = 1;
        redis.hmset(REDIS_KEY_MAIL + uid, mailId, JSON.stringify(mailInfo), function () { });

        console.log("----------105 ---resClient ", resClient);
        cb(null, 4105, "SC_Mail_Check", resClient);
    });
};
//删除邮件
mods["106"] = function (sid, uid, data, cb) {

    console.log("-----mods[106]==>data: ", data);
    var resClient = {err: 0, result: 0};
    if(data == undefined || data.id == undefined){
        resClient.err = 1;
        cb(null, 4106, "SC_Mail_Del", resClient);return;
    }
    var mailId = data.id *1;
    redis.hgetall(REDIS_KEY_MAIL + uid, function (err, objMail) {
        if(err || objMail == undefined){
            resClient.err = 20;
            cb(null, 4106, "SC_Mail_Del", resClient);return;
        }

        var mailInfo = testPlayerInfo.mailList[mailId];
        var isNewMail = false; ///是否是新邮件
        if (mailInfo == undefined || mailInfo == null) {
            mailInfo = JSON.parse(objMail[mailId]);
            if (mailInfo == undefined || mailInfo == null) {
                resClient.err = 2;
                cb(null, 4106, "SC_Mail_Del", resClient); return;
            }
            isNewMail = true;
        }

        if(isNewMail == false) { ///不是新邮件才能删除内存数据
            delete testPlayerInfo.mailList[mailId];
        }
        resClient.result = 1;

        redis.hdel(REDIS_KEY_MAIL + uid, mailId, function () { });

        console.log("----------106 ---resClient ", resClient);
        cb(null, 4106, "SC_Mail_Del", resClient);
    });
};
//领取邮件附件
mods["108"] = function (sid, uid, data, cb){

    console.log("-----mods[108]==>data: ", data);
    var resClient = {err: 0, result: 0};
    if(data == undefined || data.id == undefined){
        resClient.err = 1;
        cb(null, 4108, "SC_Mail_Adjunct", resClient);return;
    }
    var mailId = data.id *1;
    redis.hgetall(REDIS_KEY_MAIL + uid, function (err, objMail) {
        if (err || objMail == undefined) {
            resClient.err = 20;
            cb(null, 4108, "SC_Mail_Adjunct", resClient); return;
        }
        var mailInfo = testPlayerInfo.mailList[mailId];
        var isNewMail = false; ///是否是新邮件
        if (mailInfo == undefined || mailInfo == null) {
            mailInfo = JSON.parse(objMail[mailId]);
            if (mailInfo == undefined || mailInfo == null) {
                resClient.err = 2;
                cb(null, 4108, "SC_Mail_Adjunct", resClient); return;
            }
            isNewMail = true;
        }

        if (mailInfo.isAdjunct > 0) {
            resClient.err = 3;
            cb(null, 4108, "SC_Mail_Adjunct", resClient);
            return;
        }

        var tempItems = mailInfo.itemList;
        if (tempItems == undefined || tempItems.length <= 0) {
            resClient.err = 4;
            cb(null, 4108, "SC_Mail_Adjunct", resClient); return;
        }

        ////物品添加的操作 start
        for (var i = 0; i < tempItems.length; i++) {

        }
        ////物品添加的操作 end
        mailInfo.isAdjunct = 1;
        resClient.result = 1;
        if(isNewMail == true){///是新邮件才加入到内存中
            testPlayerInfo.mailList[mailId] = mailInfo;
        }
        redis.hmset(REDIS_KEY_MAIL + uid, mailId, JSON.stringify(mailInfo), function () { });

        console.log("----------108 ---resClient ", resClient);
        cb(null, 4108, "SC_Mail_Adjunct", resClient);
    });
};
//一键领取
mods["109"] = function (sid, uid, data, cb){
    console.log("-----mods[109]==>data: ", data);
    var resClient = {err: 0, result: 0};
    if(testPlayerInfo.mailList == undefined || Object.keys(testPlayerInfo.mailList).length <= 0){
        resClient.err = 1;
        cb(null, 4109, "SC_Mail_OneKey_Adjunct", resClient);return;
    }
    redis.hgetall(REDIS_KEY_MAIL + uid, function (err, objMail) {
        if (err || objMail == undefined) {
            resClient.err = 20;
            cb(null, 4109, "SC_Mail_OneKey_Adjunct", resClient);
            return;
        }
        //// 对比邮件列表长度
        var isExistNewMail = false;
        var tempMailList = testPlayerInfo.mailList;
        if(Object.keys(objMail).length > Object.keys(tempMailList).length){
            isExistNewMail = true;
        }
        if(isExistNewMail){
            for(var key in objMail){
                tempMailList[key] = JSON.parse(objMail[key]);
            }
        }
        /// 找出未领取的邮件
        //var tempItems = {};
        for (var key in tempMailList) {
            var tempMail = tempMailList[key];
            if (tempMail.isAdjunct <= 0 && tempMail.itemList != undefined && tempMail.itemList.length > 0) {
                /// 已领取
                tempMail.isAdjunct = 1;
            }

            if (tempMail.state <= 1) {
                /// 已查看
                tempMail.state = 2;
            }

            redis.hmset(REDIS_KEY_MAIL + uid, key, JSON.stringify(tempMail), function () { });
        }
        ////物品添加的操作 start

        ////物品添加的操作 end

        testPlayerInfo.mailList = tempMailList;  ///重新赋值(怕redis数据中有新邮件)
        resClient.result = 1;
        cb(null, 4109, "SC_Mail_OneKey_Adjunct", resClient);
    });
};
//一键删除
mods["110"] = function (sid, uid, data, cb){
    console.log("-----mods[110]==>data: ", data);
    var resClient = {err: 0, result: 0};
    var isUnAdjunct = false;
    var maxDelteNum = 200;  ///只判断前200封邮件

    redis.hgetall(REDIS_KEY_MAIL + uid, function (err, objMail) {
        if (err || objMail == undefined) {
            resClient.err = 20;
            cb(null, 4110, "SC_Mail_OneKey_Del", resClient);
            return;
        }
        //// 对比邮件列表长度
        var isExistNewMail = false;
        var tempMailList = testPlayerInfo.mailList;
        if(Object.keys(objMail).length > Object.keys(tempMailList).length){
            isExistNewMail = true;
        }
        if(isExistNewMail){
            for(var key in objMail){
                tempMailList[key] = JSON.parse(objMail[key]);
            }
        }
        for (var key in tempMailList) {
            if (maxDelteNum <= 0) {
                break;
            }
            if (tempMailList[key].itemList.length > 0 && tempMailList[key].isAdjunct <= 0) {
                isUnAdjunct = true;
                break;
            }
            maxDelteNum--;
        }
        if (isUnAdjunct == true) {
            resClient.err = 1;
            cb(null, 4110, "SC_Mail_OneKey_Del", resClient);
            return;
        }

        maxDelteNum = 200;  ///只判断前200封邮件
        for (var key in tempMailList) {
            if (maxDelteNum <= 0) {
                break;
            }
            delete tempMailList[key];
            maxDelteNum--;

            redis.hdel(REDIS_KEY_MAIL + uid, key, function () { });
        }

        testPlayerInfo.mailList = tempMailList;
        resClient.result = 1;
        cb(null, 4110, "SC_Mail_OneKey_Del", resClient);
    });
};

//进入竞赛房间  向后端转发的消息 (为什么要和普通房间分开?)
mods["202"] = function (sid, uid, data, cb) {
};

//心跳
mods["222"] = function (sid, uid, data, cb) {
    //console.log("pingpong");
    var now = Date.now();
    var obj = {
        secondtime: now / 1000,
        microtime: now % 1000
    };
    clearTimeout(session.getSession(sid).timeout);
    session.getSession(sid).timeout = setTimeout(function () {
        session.kickoff(sid);
    }, KICKOFF_TIMEOUT);
    cb(null, 4222, "SC_Heartbeat", obj);
};

//解锁皮肤?
mods["227"] = function (sid, uid, data, cb) {
};

//切换皮肤 如果在room中 向后转发
mods["228"] = function (sid, uid, data, cb) {
};

//竞赛信息获取 应该不用向后端转发
mods["301"] = function (sid, uid, data, cb) {
};
//检查是否可以开始竞赛游戏(为什么还要检查 在获取竞赛信息时就可以获取到消息)
mods["303"] = function (sid, uid, data, cb) {
};

//获取排名信息前50?
mods["304"] = function (sid, uid, data, cb) {
};

//开始竞赛游戏 向后端转发的消息
mods["305"] = function (sid, uid, data, cb) {
};

//某种攻击爆炸 向后端转发的消息
mods["403"] = function (sid, uid, data, cb) {
};

//返回成就信息
mods["501"] = function (sid, uid, data, cb) {

    var result = {};
    cb(null, 4501, "SC_AchievementData", result);
};

//领取成就奖励
mods["503"] = function (sid, uid, data, cb) {

};

//使用技能 向后端转发
mods["601"] = function (sid, uid, data, cb) {
    //TODO 检查玩家在线
    //TODO 检查玩家在房间
    //TODO 检查技能可用
    //TODO 向后转发
};

// 买&用技能(什么鬼) 如果真的先买后用
mods["605"] = function (sid, uid, data, cb) {

    //TODO 买技能
    //TODO 使用技能--mods[601]
};

//处理技能
mods["603"] = function (sid, uid, data, cb) {
    //TODO 检查在房间中
    //TODO 能够使用技能
    //TODO 向后端转发(后端进行房间级的广播)
};

var writeAward = function (uid, obj, cb) {
    redis.hmset(REDIS_KEY_LOGIN_REWARD + uid, obj, function (err, obj) {
        cb(err, obj);
    });
}

//时间奖励获取数据
mods["801"] = function (sid, uid, data, cb) {
    redis.hgetall(REDIS_KEY_TIME_REWARD + uid, function (err, obj) {
        var current = Date.now();
        var info = {
            awards1:0,
            awards2:0,
            awards3:0,
            time: COMM.timestamp(current)};


        if (err) {
            //TODO 发送给客户端一个错误信息

            //console.log("-------- 4801--------" + JSON.stringify(info));
            cb(null, 4801, "SC_TimeRewardGoldZero", info);
            return;
        }


        if(!obj.awards1){
            redis.hmset(REDIS_KEY_TIME_REWARD + uid, info, function () {});
        }
        else{
            var curDate = new Date();
            var dbDate = new Date(obj.time*1000);
            if(COMM.isSameDate(curDate, dbDate)){
                info.awards1 = obj.awards1;
                info.awards2 = obj.awards2;
                info.awards3 = obj.awards3;
            }
        }

        cb(null, 4801, "SC_TimeRewardGoldZero", {
            award1:info.awards1*1 ? true:false,
            award2:info.awards2*1 ? true:false,
            award3:info.awards3*1 ? true:false,
            time:info.time
        });

        logger.info("-------- 4801--------" + JSON.stringify(info));

    });
};

var getAwardId = function(hour){
    for(var k  in tblTimeAward){
        var obj = tblTimeAward[k];
        if(hour >= obj["hour_begin"] &&
            hour <= obj["hour_end"]){
            return k*1;
        }
    }

    return -1;
}
var getAward = function(hour){
    var idx = getAwardId(hour);
    if(idx != -1){
        return tblTimeAward[idx].gold
    }

    return 0;
}

mods["802"] = function (sid, uid, data, cb) {
    var result = {is:false, num:0};
    redis.hgetall(REDIS_KEY_TIME_REWARD + uid, function (err, obj) {

        if(err|| !obj.awards1 || !obj.awards2 || !obj.awards3 ){
            cb(null, 4802, "SC_TimeReward", result);
            return;
        }

        var curDate = new Date();

        var info = {
            awards1:obj["awards1"] *1 ? true:false,
            awards2:obj["awards2"] *1 ? true:false,
            awards3:obj["awards3"] *1 ? true:false,
            time: obj.time};



        var process = function(key){
            var type  = obj[key] *1;
            if(!type){
                info[key] = true;

                result.is = info[key];
                result.num = getAwardId(curDate.getHours()) *1 +1;


                redis.hmset(REDIS_KEY_TIME_REWARD + uid,  {
                    awards1:info["awards1"] ? 1:0,
                    awards2:info["awards2"] ? 1:0,
                    awards3:info["awards3"] ? 1:0,
                    time: info.time}, function () {});

                redis.hgetall(REDIS_KEY_USER_INFO + uid, function (err, obj) {
                    console.log("obj.gold111111111111111111: ", obj.gold);
                    var award = getAward(curDate.getHours());
                    obj.gold = obj.gold*1 + getAward(curDate.getHours());
                    redis.hmset(REDIS_KEY_USER_INFO + uid, {gold :obj.gold}, function (err,ret) {
                        /*redis.hgetall(REDIS_KEY_USER_INFO + uid, function (err, obj){
                         console.log("obj.gold2222222222222222222: ", obj.gold);
                         });*/
                    });
                });
            }

        }


        var idx = getAwardId(curDate.getHours());
        if(idx != -1){
            process("awards"+(idx+1));
        }



        cb(null, 4802, "SC_TimeReward", result);
    })
};

//商城 购买
mods["901"] = function (sid, uid, data, cb) {

    var result = {productID: null, productType: null, productNum: null};
    var pid = data.productID;

    var productType = null;
    var productNum = null;
    for (var i = 0; i < mall_gold.gold.length; i++) {
        if (mall_gold.gold[i].Index == pid) {
            productType = 1; //金币
            productNum = mall_gold.gold[i].stand_num;

        }
    }
    for (var j = 0; j < mall_diamond.diamond.length; j++) {
        if (mall_diamond.diamond[j].Index == pid) {
            productType = 2; //钻石
            productNum = mall_diamond.diamond[j].stand_num;
        }
    }
    if (!productType) {
        //log.info("productid error!!!");
        return;
    }
    if (productType == 1) {
        addGold(productNum);
    } else if (productType == 2) {
        addCrystal(productNum)
    }
    result.productID = pid;
    result.productType = productType;
    result.productNum = productNum;
    cb(null, 4901, "SC_PurchProduct", result);
};

//获取签到信息
mods["807"] = function (sid, uid, data, cb) {
    console.log("sid+uid+data==", sid,uid,data);

    //this.playerList = {};
    /*var self = this;
    redis.hgetall(REDIS_KEY_USER_INFO + uid, function (err, data) {
        console.log("wwwwwwwwwwwww==", data);
        if (err) {
            return cb(err);
        }
        console.log("self.playerList==", playerList);
        playerList[uid] = new Player(uid, data, self.fServerId, self.roomManager, self.msgManager);
        //cb(null, self.playerList[uid]);*/

        redis.hgetall(REDIS_KEY_LOGIN_REWARD + uid, function (err, obj) {
            if (err || !obj) {
                cb(null, 4807, "SC_CheckRegisterData", {registerData: {day: 0, result: false}});
                return;
            }

            var day = obj.day;
            //console.log("day: ", day);
            //第一次签到, 通知客户端同时写档
            if (day == undefined) {
                redis.hmset(REDIS_KEY_LOGIN_REWARD + uid, {time: 0, day: 0}, function (err, rcb) {
                    cb(null, 4807, "SC_CheckRegisterData", {registerData: {day: 0, result: true}});
                });
                return;
            }

            //非第一次玩
            var isToday = COMM.isSameDate(new Date(), new Date(obj.time * 1));
            console.log(" ========第 %d 天的奖励==>isToday: ", obj.day, isToday);
            /*console.log("obj: ", obj);
             console.log("obj.time: ", obj.time);
             console.log("new Date(obj.time) ",new Date(obj.time*1));*/
            cb(null, 4807, "SC_CheckRegisterData", {
                registerData: {
                    day: obj.day,
                    result: !isToday
                }
            });

            // 测试代码，客户端每发一次807消息即可以重置一下领取奖励时间
            /*
             var day = obj.day*1+1;
             day = day < loginReward.length ? day : 1;
             redis.hmset(REDIS_KEY_LOGIN_REWARD + uid, {time: Date.now()-24*60*60*1000, day: day}, function(err, rcb){});
             */
        });
    //});
};

//签到并获取奖励
mods["808"] = function (sid, uid, data, cb) {
    redis.hgetall(REDIS_KEY_LOGIN_REWARD + uid, function (err, obj) {
        //非法
        if(err || !obj || undefined == obj.day){
            cb(null, 4808, "SC_GetRegisterAward", {registerData: {day: 0, result: false}});
            return ;
        }

        //已经领过了
        var isSameDay = COMM.isSameDate(new Date(), new Date(obj.time*1));
        if (isSameDay) {
            //console.log(" ========obj.day==>: ", obj.day);
            cb(null, 4808, "SC_GetRegisterAward", {registerData: {day: obj.day, result: false}});
            return;
        }

        //领取奖励
        if (obj.day < loginReward.length) {
            obj.day++;
            cb(null, 4808, "SC_GetRegisterAward", {registerData: {day: obj.day, result: true}});
            redis.hmset(REDIS_KEY_LOGIN_REWARD + uid, {time: Date.now(), day: obj.day}, nop);
            checkLoginReward(obj.day, uid);
        } else {
            cb(null, 4808, "SC_GetRegisterAward", {registerData: {day: 1, result: true}});
            redis.hmset(REDIS_KEY_LOGIN_REWARD + uid, {time: Date.now(), day: 1}, nop);
            checkLoginReward(1, uid);
        }
    })
};

//换话费
mods["910"] = function (sid, uid, data, cb) {

};
//换卡
mods["911"] = function (sid, uid, data, cb) {

};

//debug
mods["99999"] = function (sid, uid, data, cb) {

};

function isPlayerInRoom(sid) {
    return session.get(SESSION_FIELD_ROOM_ID);
}

//异步添加金币
function addGold(uid, gold, cb) {
}

//减少金币
function subtractGold(uid, gold, cb) {
}

//加水晶(水晶是什么鬼)
function addCrystal(uid, crystal, cb) {
}

//减水晶
function subtractCrystal(uid, crystal, cb) {
}

function checkLoginReward(day, uid) {

        //console.log("obj.day",obj.day);
        //for(var k  in loginAward){
            var loginrew = loginAward[day];
            //if(day == loginrew.day){
                //var m = k;
                console.log("loginrew.day",loginrew.day);
                //console.log("loginrew.gold",loginrew.gold);
                redis.hgetall(REDIS_KEY_USER_INFO + uid, function (err, obj) {
                    console.log("11111111obj.gold",obj.gold);
                    //var loginrew1 = loginAward[day];
                    //console.log("loginrew1.gold",loginrew1.gold);
                    obj.gold = obj.gold*1 + loginrew.gold;
                    redis.hmset(REDIS_KEY_USER_INFO + uid,{gold :obj.gold}, function(err,ret){
                        redis.hgetall(REDIS_KEY_USER_INFO + uid, function (err, obj) {
                            console.log("22222222obj.gold",obj.gold);
                        })

                    });
                })
           // }
       // }

}

/**
 * 将从db中获取的数据格式化为要传给客户端的格式
 * @param info 从db中获取的值 进入这个方法前必须检查完毕
 * @return Object 返回一个json格式的数据 作为直接发送回client的内容
 * */
function formatUserInfo(info, uid) {
    var playerInfo = {};
    playerInfo.uid = uid; //id
    playerInfo.pos = parseInt(info.playerpos) || -1; //房间内位置
    playerInfo.name = info.nickname; //昵称
    playerInfo.gold = parseInt(info.gold);//金币
    playerInfo.gem = parseInt(info.gem);//钻石
    playerInfo.weaponId = parseInt(info.weapontype) || 0;//装备的武器id
    playerInfo.coupon = parseInt(info.coupon);//兑换券
    playerInfo.energy = parseInt(info.sceneEnergy) || 0;//能量
    playerInfo.headurl = info.headImage;//头像地址
    playerInfo.showid = parseInt(info.outsideUuid);//对外展示用的id

    playerInfo.skinType = info.inUseSkin || skinConfigManager.getDefaultSkinId();//正在使用的皮肤id 需要一个默认值
    playerInfo.unlockedMaxSceneId = info.unlockMaxSceneId || DEFAULT_UNLOCKED_SCENE;//最高解锁的场景id
    playerInfo.weaponMaxLevel = 0; //武器最高等级


    playerInfo.optimalComScore = info.historyTopScore || 0;//历史最高分

    //===
    var baseCost = 0;
    var unlockWeaponTypes = [DEFAULT_WEAPON_TYPE];
    if (info.unlockWeaponTypes) {
        unlockWeaponTypes = eval("(" + info.unlockWeaponTypes + ")");
        if (unlockWeaponTypes.length == 0) {
            unlockWeaponTypes.push(DEFAULT_WEAPON_TYPE);
        }
    }
    for (var i in unlockWeaponTypes) {
        //在所有解锁武器里面找到cost最高的
        var weaponType = unlockWeaponTypes[i];
        var weapon = skinConfigManager.getWeaponInfo(weaponType);

        if (weapon.cost >= baseCost) {
            playerInfo.weaponMaxLevel = weapon.weapon_id;
            baseCost = weapon.cost;
        }
    }
    playerInfo.weaponMaxLevel = parseInt(playerInfo.weaponMaxLevel);

    //===
    playerInfo.unlockedSkins = [];//已解锁皮肤列表
    var unlockSkins = info.unlockSkins ? JSON.parse(info.unlockSkins) : [];
    for (var i in unlockSkins) {
        playerInfo.unlockedSkins.push(unlockSkins[i]);
    }

    //===
    var skills = info.skills ? JSON.parse(info.skills) : {};
    playerInfo.skillSuoding = skills[1100102] || 0; //锁定技能的剩余数量
    playerInfo.skillBingfeng = skills[1100101] || 0;//冰封技能的剩余数量
    return playerInfo;
}

module.exports = function (_session, _rpcManager, _redis) {
    session = _session;
    rpcManager = _rpcManager;
    redis = _redis;
    return mods;
};