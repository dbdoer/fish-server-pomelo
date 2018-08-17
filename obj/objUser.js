/**
 *  用户信息封装，所有关于用户的信息操作封装于类中。
 *  user 只在 frontserver 进行写档操作，
 *  RPC Server需要和fornt server 通讯，由front server 写档
 */

var util = require('util');
var Obj = require('./obj');
var ObjItem = require('./objItem');
var ObjMail = require('./objMail');
var ObjFriend = require('./objFriend');
var ObjFriendReq = require('./objFriendReq');
var userDao = require('../dao/userDao');
var userJson = require('./json/user.json');
var bagDao = require("../dao/bagDao");
var skinConfigManager = require('../Resources/weapon/SkinConfigManager');
var ContainerMng = require('./mng/containerMng');
var dataParser = require("../FrontServer/MsgParser.js");
var Mails = require("../Resources/mail");
var COMM = require('../common/commons');
var roomManager = global.roomManager;
var logger = require("../common/logHelper").helper;
var redis2mysql = require('../dao/redis2mysql');
var OnlineDao = require('../dao/onlineDao');

var DEFAULT_UNLOCKED_SCENE = 1030101;
var DEFAULT_WEAPON_TYPE = 1010101;
var  mailGood = {
    goodId:0            // = 1;
    ,goodNum:1          // = 2;
}

var ObjUser = function () {
    Obj.call(this);

    this.name = "user";
    this.data.initTemplate(userJson);
    var cm = new ContainerMng();
    cm.init();
    this.contMng = cm;
    this.totalConnData = 0;
    this.isGod = false;
    this.loginTime = 0;
    this.loginIP = 0;
    this.todayIsSign = false;
    this.time = Date.now();
};
util.inherits(ObjUser, Obj);



ObjUser.prototype.setUid = function (uid) {
    this.uid = uid;
}

ObjUser.prototype.setSid = function (sid) {
    this.sid = sid;
}

ObjUser.prototype.getUid = function () {
    return  this.uid;
}

ObjUser.prototype.getSid = function () {
    return  this.sid;
}

ObjUser.prototype.getTemlate = function () {
    return  userJson;
}

ObjUser.prototype.getVip = function () {
    return  this.getData().vipLv;
}

ObjUser.prototype.getIsSign = function () {
    return  this.todayIsSign;
}

ObjUser.prototype.setIsSign = function (isSign) {
    this.todayIsSign = isSign;
}
ObjUser.prototype.acceptScore = function (num) {
    var cur = this.getValue('score')*1;
    cur = cur + num;
    this.setValue('score', cur);

    return true;
}

ObjUser.prototype.acceptGold = function (num) {
    var cur = this.getValue('gold')*1;
    cur = cur + num*1;
    this.setValue('gold', cur);

    return true;
}

ObjUser.prototype.spendGold = function (num) {
    var cur = this.getValue('gold')*1;
    if(cur < num*1){
        return false;
    }

    cur = cur - num*1;
    this.setValue('gold', cur);
    return true;
}
ObjUser.prototype.acceptGem = function (num) {
    var cur = this.getValue('gem')*1;
    cur = cur + num;
    this.setValue('gem', cur);

    return true;
}

ObjUser.prototype.spendGem = function (num) {
    var cur = this.getValue('gem')*1;
    if(cur < num){
        return false;
    }

    cur = cur - num;
    this.setValue('gem', cur);
    return true;
}

ObjUser.prototype.acceptGlory = function (num) {
    var cur = this.getValue('glory')*1;
    cur = cur + num*1;
    this.setValue('glory', cur);

    return true;
}

ObjUser.prototype.spendGlory = function (num) {
    var cur = this.getValue('glory')*1;
    if(cur < num*1){
        return false;
    }

    cur = cur - num*1;
    this.setValue('glory', cur);
    return true;
}
ObjUser.prototype.addUnlockSkin = function (skinId) {
    if(skinId == undefined){
        return -1;
    }

    var skins = this.getValue('unlockSkins');
    if(skins == undefined || skins == null){
        return -2;
    }
    skins = JSON.parse(skins);
    skins[skinId] = 1;

    this.setValue('unlockSkins', JSON.stringify(skins));
    return true;
}
ObjUser.prototype.changeUnlockSkin = function (skinId) {
    if(skinId == undefined){
        return -1;
    }
    var skin = this.getValue('unlockedSkins');
    if(skin[skinId] == undefined){
        return -2;
    }

    return true;
}

ObjUser.prototype.setKuangBaoSkill = function (newSkillId){
    var newSkillInfo = global.skill[newSkillId];
    if(newSkillInfo == undefined){
        return -1
    }
    var curSkills = this.getValue('skills');
    if(curSkills == undefined || curSkills == null){
        return -2;
    }
    curSkills = JSON.parse(curSkills) || {};

    var l_key = 0;
    if(curSkills[newSkillId] == undefined) {
        for (var sKey in curSkills) {
            var oldSkillInfo = global.skill[sKey];
            if (oldSkillInfo != undefined && oldSkillInfo.kuangbao_energy * 1 > 0 &&
                oldSkillInfo.kuangbao_energy * 1 < newSkillInfo.kuangbao_energy * 1) {
                l_key = sKey;
                break;
            }
        }
        /// 删除原有的狂暴点数 (只能存在一个)
        delete curSkills[l_key];

        /// 记录新的狂暴点数 kuangbao_level
        curSkills[newSkillId] = newSkillInfo.kuangbao_energy * 1;
    }else{
        logger.debug('====> this new skill id %d is exist <=====' + newSkillId);
    }

    this.setValue("skills",JSON.stringify(curSkills));
}
//数据库进行读档操作
ObjUser.prototype.loadFromDb = function (cb) {
    userDao.load(this, function(err, ret){
        if(cb){
            cb(err, ret);
        }
    });
}

//数据库进行写档操作
ObjUser.prototype.writeToDb = function (cb) {
    userDao.write(this, function(err, ret){
        if(cb){
            cb(err, ret);
        }
    });
}
//数据库进行写档操作
ObjUser.prototype.writeByKeysAndValuesToDb = function (keys, values, cb) {
    var guid = this.getUid();
    userDao.writeByKeysAndValues(guid, keys, values, function(err, ret){
        if(cb){
            cb(err, ret);
        }
    });
}

ObjUser.prototype.getMsgInfo = function () {
    var info = this.getData();
    var playerInfo = {};
    playerInfo.uid = this.uid; //id
    playerInfo.pos = parseInt(info.playerpos) || -1; //房间内位置
    playerInfo.name = info.nickname; //昵称
    playerInfo.gold = parseInt(info.gold);//金币
    playerInfo.gem = parseInt(info.gem);//钻石
    playerInfo.weaponId = parseInt(info.weapontype) || 0;//装备的武器id
    playerInfo.coupon = parseInt(info.coupon) || 0;//兑换券
    playerInfo.energy = parseInt(info.sceneEnergy) || 0;//能量
    playerInfo.headurl = info.headImage;//头像地址
    playerInfo.fbheadimage = info.FBheadImage;//FaceBook头像地址
    playerInfo.fbnickname = info.FBnickname;//FaceBook昵称
    playerInfo.showid = parseInt(info.outsideUuid);//对外展示用的id

    playerInfo.skinType = info.curSkinId || skinConfigManager.getDefaultSkinId();//正在使用的皮肤id 需要一个默认值
    playerInfo.unlockedMaxSceneId = info.unlockMaxSceneId || DEFAULT_UNLOCKED_SCENE;//最高解锁的场景id
    playerInfo.weaponMaxLevel = 0; //武器最高等级
    playerInfo.vipLv = parseInt(info.vipLv); //Vip等级
    playerInfo.vipNumber = info.vipNumber; //Vip经验值
    playerInfo.level = parseInt(info.level); //玩家等级
    playerInfo.experience = info.experience.toString(); //玩家等级经验值
    playerInfo.glory = parseInt(info.glory) || 0; //荣誉值
    //playerInfo.getPackage = info.getPackage; //是否领取过首冲礼包
    playerInfo.registerTime = JSON.stringify(Date.now() - parseInt(info.registerTime));
    playerInfo.loginIP = this.loginIP;

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
    playerInfo.skinType = info.curSkinId || skinConfigManager.getDefaultSkinId();//正在使用的皮肤id 需要一个默认值
    playerInfo.unlockedSkins = [];//已解锁皮肤列表
    var unlockSkins = info.unlockSkins || {};
    logger.debug("ObjUser.getMsgInfo: unlockSkins=" +unlockSkins +"type=" +(typeof unlockSkins));
    if (unlockSkins != undefined && typeof unlockSkins === 'string') {
        unlockSkins = JSON.parse(unlockSkins);
    }
    for (var key in unlockSkins) {
        playerInfo.unlockedSkins.push(key);
    }

    //===
    var skills = info.skills || {};
    if (skills != undefined && typeof skills === 'string') {
        skills = JSON.parse(skills);
    }
    playerInfo.skillSuoding = skills[1100102] || 0; //锁定技能的剩余数量
    playerInfo.skillBingfeng = skills[1100101] || 0;//冰封技能的剩余数量


    return playerInfo;
}



//背包填充
ObjUser.prototype.fillBag = function (arr) {
    logger.debug("---fillBag----bagArr: " + JSON.stringify(arr));
    if(arr == undefined){
        return;
    }
    if((arr instanceof Array) == false || arr.length <= 0){
        return;
    }
    var bullionByGet = this.getValue("bullionByGet")*1;
    var boxByGet = this.getValue("boxByGet")*1;
    var bag = this.contMng.bag;
    for(var i=0;i<arr.length; i++){
        if(arr[i].id == 1001){
            bullionByGet += arr[i].num *1;
            this.setValue("bullionByGet", bullionByGet);
        }
        if(arr[i].id == 1401||arr[i].id == 1402||arr[i].id == 1403||arr[i].id == 1404||arr[i].id == 1405){
            boxByGet += arr[i].num *1;
            this.setValue("boxByGet", boxByGet);
        }
        var _obj = bag.getRealbyGuid(arr[i].id*1);
        if(_obj == null){
            var item = new ObjItem();
            item.setValue("propID", arr[i].id*1);
            item.setValue("propType",arr[i].type*1);
            item.setValue("propNum",arr[i].num *1);
            bag.add(item);
        }else {
            _obj.data.propNum += arr[i].num *1;
        }
    }
    bagDao.write(this, function(){});
    this.writeToDb(function(){});
}
/////////背包填充测试用(宝箱)
ObjUser.prototype.fillBag2 = function () {
    var bag = this.contMng.bag;
    for(var i=1401;i<1406; i++){
        var item = new ObjItem();
        item.setValue("propID", i);
        item.setValue("propType",4);
        item.setValue("propNum",400);
        bag.add(item);
    }
}
//(金条)
ObjUser.prototype.fillBag3 = function () {
    var bag = this.contMng.bag;
        var item = new ObjItem();
        item.setValue("propID", 1001);
        item.setValue("propType",4);
        item.setValue("propNum",500);
        bag.add(item);
}
////////背包填充测试用

//邮件填充
ObjUser.prototype.fillMail = function () {
    var mail = this.contMng.mails;
    //console.log("---mail-----obj5---",mail);
    if(mail.m_Array.length == 0){
        for(var m =0; m < 5; m++){
            var item = new ObjMail();
            //console.log("---mail-----obj6---",item.getGuid());
            var mailIdNum  = Math.floor(Math.random() * 4) +1;
            var tempMail = Mails[mailIdNum];
            if(tempMail == undefined){continue;};
            var repContent = [];
            var strArr = tempMail.content.split('%s');
            if(strArr.length > 0 && tempMail.mail_type *1 == 2);
            {///有字符替换
                repContent[0] = "XiaHou" + m;
                if(mailIdNum == 3){
                    repContent[1] = "新手";
                    repContent[2] = "2";
                }else if(mailIdNum == 4){
                    repContent[1] = "2";
                    repContent[2] = "中级";
                    repContent[3] = "1";
                }
            }
            var mailGoods = [];
            mailGoods.push({goodId: 1401, goodNum: 2},{goodId: 1001, goodNum: 20});
            /*if(tempMail.reward_type *1 >= 1){
                mailGoods.push({goodId: 1401, goodNum: 2},{goodId: 1001, goodNum: 20})
            }*/
            item.setValue("type", tempMail.mail_type);
            item.setValue("id", m+1);
            item.setValue("state", 1);
            item.setValue("templateId", mailIdNum);
            item.setValue("replacement", repContent);
            item.setValue("itemList", mailGoods);
            item.setValue("createTime",COMM.timestamp());
            item.setValue("isAdjunct", 0);
            mail.add(item);
        }
        //console.log("---mail-----obj9---",mail);
    }else {
        var info = [];
        for(var key in mail.m_Array){
            info.push(JSON.parse(mail.m_Array[key]));
        }

        /// 根据创建邮件时的时间进行刷选 start
        for(var i =0; i< info.length; i++){
            if(Number(info[i].createTime) + 15 *24 *3600 < COMM.timestamp()){
                info.splice(i, 1);  ///超过时间则删除
                i--;continue;
            }
            mail.add({name:'mail',data:info[i]});
        }
    }

}

//test 好友填充
ObjUser.prototype.fillFriend = function (){
    var friends = this.contMng.friends;
    //console.log("---mail-----obj5---",mail);
    if(friends.m_Array.length == 0){
        for(var m =0; m < 5; m++){
            var friendInfo = new ObjFriend();
            friendInfo.setValue("guid", "chukong"+m);
            friendInfo.setValue("name", "fish"+m);
            friendInfo.setValue("sex", 1);
            friendInfo.setValue("level", 23 + m);
            friendInfo.setValue("headurl", 1);
            friendInfo.setValue("vipLv", 1);
            friendInfo.setValue("gold",9999);
            friendInfo.setValue("glory", 0);
            friendInfo.setValue("state", 1);

            friends.add(friendInfo);
        }
    }
}
//test 好友填充
ObjUser.prototype.fillFriendReq = function (){
    var friendReq = this.contMng.friendReq;
    //console.log("---mail-----obj5---",mail);
    if(friendReq.m_Array.length == 0){
        for(var m = 1; m <= 5; m++){
            var friendReqInfo = new ObjFriendReq();
            friendReqInfo.setValue("guid", "robot"+m);
            friendReqInfo.setValue("name", "robot"+m);
            friendReqInfo.setValue("sex", 1);
            friendReqInfo.setValue("level", 3 + m);
            friendReqInfo.setValue("headurl", 1);
            friendReqInfo.setValue("vipLv", 0);
            friendReqInfo.setValue("gold",789765);
            friendReqInfo.setValue("glory", 0);

            friendReq.add(friendReqInfo);
        }
    }
}
ObjUser.prototype.bindConn = function (conn) {
    this.conn = conn;
}


//
ObjUser.prototype.sendMsg = function (packetId, jsonData) {
    var conn = this.conn;
    var buf = dataParser.buildProtoMsg(packetId, null, jsonData);
    conn.write(buf);
    this.totalConnData += buf.length;
    //logger.info(JSON.stringify(jsonData));

}

//设置serverid 绑定
ObjUser.prototype.setRoomServerId = function (id) {
    this.roomServerId = id;
}

// server id
ObjUser.prototype.getRoomServerId = function () {
    return this.roomServerId;
}

ObjUser.prototype.release = function () {
    logger.debug('------ > ObjUser release outsideUuid = ' + this.getValue('outsideUuid') + ",name = " + this.getValue("nickname"));
    var self = this;
    var loginTime = this.getValue('loginTime')*1;
    var totalTime = this.getValue('totalTime')*1;
    var endTime = Date.now();
    totalTime += (endTime - loginTime);
    this.setValue('totalTime',totalTime);
    var totalTime_ = Math.floor(totalTime/1000/60/60 * 10000) / 10000;
    var bigMatchInfo = 0;
    var bagItem = this.contMng.bag.m_Array;
    var bagInfo = [];
    for(var key = 0; key < bagItem.length; key++){
        bagInfo.push(bagItem[key].data);
    }
    var boxInfo = {"1001":0,"1401":0,"1402":0,"1403":0,"1404":0,"1405":0};
    for (var m = 0; m < bagInfo.length; m++) {
        for (var j in boxInfo) {
            if(bagInfo[m].propID == parseInt(j)){
                boxInfo[j] = bagInfo[m].propNum*1;
            }
        }
    }
    OnlineDao.DelOnline(this.uid);
    //var self = this;
    this.delSessionLeaveRoom(function(){
        redis2mysql.RedisPushLogout([
            COMM.timestamp()
            ,self.getValue('gold')
            ,self.getValue('outsideUuid')
            ,self.loginTime
        ]);
        self.getBigMatchOfSelfInfo(function (err,ret){
            var signInDate = self.getValue("signInDate");
            bigMatchInfo = JSON.stringify(ret);
            redis2mysql.RedisUpdateUserInfo([
                self.getValue('level')*1
                ,self.getValue('vipLv')*1
                ,self.getValue('gold')*1
                ,self.getValue('gem')*1
                ,boxInfo[1001]
                ,self.getValue("vipNumber")*1
                ,boxInfo[1401]
                ,boxInfo[1402]
                ,boxInfo[1403]
                ,boxInfo[1404]
                ,boxInfo[1405]
                ,COMM.isSameDate(new Date(), new Date(signInDate*1))
                ,self.getValue('dayNum')*1
                ,totalTime_
                ,bigMatchInfo
                ,self.getValue('outsideUuid')
            ]);
            //console.log('--------------bigMatchInfo',bigMatchInfo);

        });
    });
    global.saveLoginOutRankInfoByUser(this.data);
    //this.writeToDb(function(){});
    this.writeByKeysAndValuesToDb(["totalTime","totalTimeOneDay"],[totalTime,this.getValue('totalTimeOneDay')*1], function () { });
}
/**
 * 不管退出房间成功与否,都需清除数据以及不能影响其他玩家进入房间
 */
ObjUser.prototype.delSessionLeaveRoom = function (cb) {
    //room server error
    var self = this;
    if(self.roomServerId == null || self.roomServerId == undefined){
        logger.err("ObjUser.delSessionLeaveRoom: Quit This Game User Is Not In The Room!! <===" );
        cb();
        return;
    }
    this.rpcTrans('leaveRoom', [], function (err,ret) {
        logger.debug('ObjUser.delSessionLeaveRoom: leaveRoom ret: '+ JSON.stringify(ret) + ", err: " + err);
        if( ret != undefined && ret.level != undefined && ret.experience != undefined ){
            self.setValue("level",ret.level);
            self.setValue("experience",ret.experience);
            //self.writeToDb(function(){});
            self.writeByKeysAndValuesToDb(["level","experience"],[ret.level,ret.experience],function () {});
        }

        cb();
        return;
    });
}
ObjUser.prototype.getBigMatchOfSelfInfo = function (cb) {
    if(!roomManager){
        cb("error no roomManager", null);
        return ;
    }
    var rpcMng = roomManager.rpcManager;
    var self = this;
    var server = rpcMng.getRpcByRType('BigMatchServer');//如果拿到了rpcClient 那就当做肯定能够获取到远程方法
    if(!server){
        cb("error no rpcServer", null);
        return;
    }

    var sender = server.getMethod("getBigMatchOfSelfInfo");
    if(!sender){
        cb("error no getBigMatchOfSelfInfo", null);
        return;
    }
    sender(self.getUid(), function (err, data) {
        //console.log("-------------------------------data", data);
        cb(err, data);
    });
}

/**
 * rpc 通讯,client 发送消息给后端服务器
 */
ObjUser.prototype.rpcTrans = function (key, param, cb) {
    if(!cb) {
        cb = function (err, reply) {
            if(err) {
                logger.err("ObjUser.rpcTrans: error:" + err);
            }
        }
    }
    if(!roomManager){
        logger.err("ObjUser.rpcTrans: error no roomManager.");
        cb("ObjUser.rpcTrans: error no roomManager", null);
        return ;
    }
    var rpcMng = roomManager.rpcManager;
    var self = this;

    console.log("ObjUser.rpcTrans: entered. self.serverId:" +self.roomServerId +", key:" +JSON.stringify(key));

    var server = rpcMng.getRpcByServerId(self.roomServerId); //如果拿到了rpcClient 那就当做肯定能够获取到远程方法
    if(!server) {
        var server2 = rpcMng.getRpcByServerId2();
        logger.err("ObjUser.rpcTrans: error. current servers:", server2);
        logger.err("ObjUser.rpcTrans: error no rpcServer, roomServerId:"+ self.roomServerId + ", key:" +key + ", name:" +self.getValue("nickname"));
        cb("ObjUser.rpcTrans: error no rpcServer", null);
        return;
    }

    var sender = server.getMethod("msgPacketTrans");
    if(!sender) {
        logger.err("ObjUser.rpcTrans: error no msgPacketTrans, self.Id:" +self.roomServerId +", server.Id:" +server.serverId +", key:" +key +", name:" +self.getValue("nickname"));
        cb("ObjUser.rpcTrans: error no msgPacketTrans", null);
        return;
    }
    //console.log(">>> rpc client send key=%s uid=%s, param=%s", key, self.getUid(), JSON.stringify(param));
    sender(key, self.getUid(), param, function (err, data) {
        //console.log("<<<rpc client recv key=%s uid=%s, data=%s", key, self.getUid(), JSON.stringify(data));
        cb(err, data);
    });
}

ObjUser.prototype.countData = function (num) {
    this.totalConnData += num;
}

ObjUser.prototype.setGod = function (flag) {
    this.isGod = !!flag;
}


ObjUser.prototype.getSoket = function () {
    return this.conn;
}
/**
 * Expose 'ObjUser' constructor.
 */
module.exports = ObjUser;
