"use strict";
/**
 * Created by ck01-441 on 2016/3/7.
 * 玩家 属性
 * room可以为null
 */

var REDIS_KEY_SUBSIDY = "fish4subsidy:";//破产补助
//var redis = require("../database/redis.js").getCluster();
var redis = require("../dao/redis/redisCmd");
var COMM = require('../common/commons');
var logger = require("../common/logHelper").helper;
var guideRoom = require("../common/NewbieGuideRoom");


module.exports = Player;
function Player(uid, data, fServerId, roomManager, msgManager, playerManager) {
    this.uid = uid;
    this.fServerId = fServerId;
    this.roomManager = roomManager;
    this.msgManager = msgManager;
    this.msgDispatcher = playerManager;
    this.room = null;
    this.fireCount = 0;
    this.fireMap = {};
    this.fireQueue = [];//顺序保存fireId 超过100开始从头删除
    this.pos = -1;
    this.init(data);

    this.curUseSkillId = {};   ///当前使用的技能ID = {id:"name",..}
    this.useSkillCost = 1;    ///当前使用的技能金币的消耗
    this.bombWeapon = null;  ///捕获炸弹时的武器信息
    this.subsidyNum = null;   ///破产补助次数
    this.subsidyStartTime = null;   ///破产补助倒计时开始时间*秒值*
    this.latelySubsidyTime = null;  ///最近一次破产补助的时间*秒值*
    this.captureWeaponFish = {}; /// 是否捕获了特殊武器鱼*{fishType, weaponInfo}*
}

/**
 * 初始化player对象
 * @param data{object} 从redis中获取的原始对象
 * */
Player.prototype.init = function (data) {
    this.gold = data.gold*1;
    //console.log('-------------------inittypeof1 ',typeof(this.gold));
    //console.log('Player.prototype.init ==>data: ',data);
    this.gem = data.gem*1;
    this.name = data.nickname;
    this.headurl = data.headImage;
    this.FBheadImage = data.FBheadImage;
    this.FBnickname = data.FBnickname;
    this.rechargeCoefficient = data.rechargeCoefficient*1;
    this.costQuota = data.costQuota*1;
    this.costquotaPool = data.costquotaPool*1;
    this.curSkinId = data.curSkinId;
    this.vipLv = data.vipLv*1;
    this.level = data.level*1;
    this.experience =  data.experience*1;
    this.noviceCoefficient =  data.noviceCoefficient*1;
    this.cardBoxPropRate = data.cardBoxPropRate*1;
    this.fire_time = 0;

    this.curGuideStep = data.guideStep *1|| 1;
    if(this.curGuideStep > global.guideStepDetail.SharkDead && this.curGuideStep < global.guideStepDetail.RewardGiftbag){
        this.guideCapture = 1;   ///只要大于0就行
    }

    var self = this;
    redis.hgetall(REDIS_KEY_SUBSIDY + self.uid, function (err, obj) {
        if(err != undefined ){
            return;
        }
        if(obj == undefined || Object.keys(obj).length <= 0){
            /// 初始化数据到redis
            var curTime = Date.now();
            self.subsidyNum = 0;
            self.subsidyStartTime = 0;
            self.latelySubsidyTime = COMM.timestamp(curTime);
            redis.hmset(REDIS_KEY_SUBSIDY + self.uid, {
                subsidyNum:self.subsidyNum,
                subsidyStartTime: self.subsidyStartTime,
                latelySubsidyTime: self.latelySubsidyTime}, function () {});
        }
        else{
            self.subsidyNum = obj.subsidyNum;
            self.subsidyStartTime = obj.subsidyStartTime;
            self.latelySubsidyTime = obj.latelySubsidyTime;
        }
    });
};

/**
 * 获取玩家当前信息
 *  返回完整的玩家数据结构
 * */
Player.prototype.getUserInfo = function () {
    var tempUseSkill;
    for(var key in this.curUseSkillId){
        if(this.curUseSkillId[key] != undefined){
            if(tempUseSkill != undefined){ tempUseSkill = tempUseSkill +"|"}
            tempUseSkill = (tempUseSkill ||"") + key;
        }
    }
    return {
        uid: this.uid,
        gold: this.gold,
        gem: this.gem,
        pos: this.getPos(),
        headurl: this.headurl,
        fbheadimage: this.FBheadImage,
        fbnickname: this.FBnickname,
        weaponId: this.weapon.weapon_index *1,
        skinType: this.curSkinId || 10109,
        name: this.name || 'sth',
        coupon: 0,
        energy: 0,
        optimalComScore: 0,
        showid: this.showId || 0,
        level: this.level,
        experience:this.experience,
        curUseSkill: tempUseSkill||""
    };
};

Player.prototype.getPos = function () {
    return this.pos + 1;//客户端position从1开始
};

Player.prototype.setBombWeapon = function (weapon) {
    this.bombWeapon = weapon;
};
/**
 * 进入房间
 * @param type{Number} 房间类型
 * @param roomId{string|null} 房间id
 * @param pwd{string|null} 房间密码
 * @param cb{function} 结果回调
 * */
Player.prototype.enterRoom = function (type, roomId, pwd, cb) {
    logger.info("RoomServer.Player.enterRoom: entered. type=" +type +" roomId=" +roomId +" pwd=" +pwd +" curGuideStep=" +this.curGuideStep);
    //this.roomtype = type;
    var validRoomId = roomId;

    var room;
    /// 是否进入新手引导的房间
    if(this.curGuideStep >= global.guideStepDetail.SharkDead &&
        this.curGuideStep < global.guideStepDetail.GuideEnd &&
        type *1 == 1000)
    {
        room = guideRoom();
    } else {
        if (!validRoomId) {
            //没有房间id根据type获取一个可以进入的房间
            room = this.roomManager.getAvailableRoom(type);
        } else {
            //有id则根据id选择特定房间
            room = this.roomManager.getSpecificRoom(validRoomId);
        }
    }

    if (!room) {
        //本server不在接受此类型的加入请求
        // 返回FrontServer一个加入失败的错误码
        logger.err('RoomServer.Player.enterRoom: error room 1001 ');
        cb(1001);
        return false;
    }

    this.pwd = pwd;
    var result = room.enterRoom(this);

    switch (result) {
        case 0 :
            //成功进入房间
            break;
        case 1:
            //密码不正确
            cb(1002);
            return false;
        /*case 3:
            //vip等级不够无法进入大亨场
            cb(1003);
            return false;*/
        case 2 :
            //房间满员 从新调用一次进入房间以请求RoomManager分配新房间
            return this.enterRoom(type, null, pwd, cb);
        default:
            //未知错误
            cb(9001);
            return false;
    }
    this.room = room;
    this.pos = room.playerPos.indexOf(this);
    var info = room.getRoomInfo(); //需要发还给FrontServer 并转给client
    //console.log('room info in player\n' + JSON.stringify(info));
    if(this.curGuideStep > global.guideStepDetail.TaskFishDead){
        info.goldPool = 0;
    }

    cb(null, info);

    logger.info("RoomServer.Player.enterRoom: leaved.");

    return true
};

/**
 * 消耗或增加资源
 * @param type{int} 资源类型(1: 金币, 2: 宝石)
 * @param value{int} 资源数量
 * @param useType{int} 使用类型 (0: 减, 1: 增)
 * */
Player.prototype.costOrAdd = function (type, value, useType) {
    if(type == RES_TYPE_GOLD && useType <= 0) {
        var isOk = this.checkRes(type, value);
        if (isOk == undefined || !isOk) {
            return false;
        }
    }
    value = value *1;
    if(useType <= 0){
        value = -value;
    }
    //TODO log
    this[RES_TABLE[type]] = this[RES_TABLE[type]] *1 + value;
    return true;
};
/**
 *  碰撞
 *  @param data{object}
 *  @param cb{function} 回调
 * */
Player.prototype.explosion = function (data, cb) {
    var fireId = data.fireid;
    var tempFullCapture = data.isFullCapture;
    var tempBombValue = data.bombValue;
    if (fireId == undefined || tempFullCapture == undefined || tempBombValue == undefined) {
        console.log('==explosion==>fireId || tempFullCapture == undefined');
        cb(100); return;
    }
    var weapon;
    if(tempFullCapture *1 <= 0 || tempFullCapture == 2) {
        ///正常情况下tempFullCapture为0;Debug功能设置tempFullCapture为 2;
        weapon = this.fireMap[fireId];
        if (!weapon) {
            console.log('explosion can not find fire info');
            cb(101); return;
        }
    }else {
        if(this.bombWeapon == null){
            console.log('===>this.bombWeapon == null<=====');
            cb(102); return;
        }
        weapon = this.bombWeapon;
    }
    var ret = null;
    var worth = 0;
    if (data.fishid.length > 0) {
        ret = this.room.explosion(this, weapon, data.fishid, tempFullCapture, tempBombValue);
        var tempDeadFish = ret.deadFish;
        for (var k = 0; k < tempDeadFish.length; k++) {
            if(tempDeadFish[k]== undefined){ continue; }
            worth += tempDeadFish[k].gold *1 || 0;
        }
    }
    delete this.fireMap[fireId];
    if(ret == undefined || ret == null){
        ret = {gold: 0, list:[]};
    }
    ret.gold += worth;
    /// 玩家等级升级的奖励
    if(ret.levelReward != undefined){
        //console.log("---111---->> levelReward: ",ret.gold, ret.levelReward.number, this.gold);
        if(ret.levelReward.type*1 == 1){/// 金币
            ret.gold += ret.levelReward.number *1 || 0;
        }
    }
    this.room.retgold = ret.gold;

    //console.log("--111111-----Player--explosion: ",ret.gold, this.gold);
    if (ret.gold > 0) {
        this.costOrAdd(RES_TYPE_GOLD, ret.gold, 1);
    }

    if(this.curGuideStep <= global.guideStepDetail.GuideEnd){
        ret.curGuideStep = this.curGuideStep;
    }
    //console.log("--111112-----Player--explosion: ", this.gold);
    cb(null, ret);
};
/**
 * 特殊武器碰撞
 * */
Player.prototype.specialExplosion = function (data, cb){
    var fishidlist = data.fishidlist;
    var finalExplode = 0;
    if (fishidlist == undefined || this.room == undefined || this.captureWeaponFish.weaponInfo == undefined) {
        console.log('==specialExplosion==>fireId || weaponInfo == undefined');
        cb(100); return;
    }

    if(data.finalExplode != undefined){
        finalExplode = data.finalExplode *1;
    }

    var tempSurEnergy = (global.specialInfo.ztp_residual_energy*1 ) * this.room.themeScene.totalWeaponEnergy;
    if(finalExplode == 0 && this.room.themeScene.weaponFishEnergy < tempSurEnergy){
        console.log('==Normal==>weaponFishEnergy: %s < %s, fishIds: %s',this.room.themeScene.weaponFishEnergy, tempSurEnergy,fishidlist);
        cb(101); return;
    }
    var ret = null;
    var worth = 0;
    if (fishidlist.length > 0) {
        ret = this.room.explosion(this, this.captureWeaponFish.weaponInfo, fishidlist, 0, 0, finalExplode);
        var tempDeadFish = ret.deadFish;
        for (var k = 0; k < tempDeadFish.length; k++) {
            if(tempDeadFish[k]== undefined){ continue; }
            worth += tempDeadFish[k].gold *1 || 0;
        }

        if(finalExplode == 1){
            this.captureWeaponFish = {}; ///结束后清空数据
        }
    }

    //console.log("---222---specialExplosion->> ret: ",JSON.stringify(ret));
    if(ret == undefined || ret == null){
        ret = {gold: 0, list:[]};
    }
    ret.gold += worth;
    /// 玩家等级升级的奖励
    if(ret.levelReward != undefined){
        //console.log("---111---->> levelReward: ",gold, str.levelReward.number, this.gold);
        if(ret.levelReward.type*1 == 1){/// 金币
            ret.gold += ret.levelReward.number *1 || 0;
        }
    }
    if (ret.gold > 0) {
        this.costOrAdd(RES_TYPE_GOLD, ret.gold, 1);
    }
    cb(null, ret);
}
Player.prototype.coefficientCheck = function (cb) {
    var self = this;
    var ret = {};

    ret = this.room.getTaxAgain(this);
    console.log('---------------------ret',ret);
    cb(null,ret);
};

//离开房间
Player.prototype.leaveRoom = function (cb) {
    //this.coefficientCheck();
    var self = this;
    if (this.room == null || this.room == undefined) {
        cb(1001, null); return;
    }
    //this.save();  ///保存破产数据
    this.room.leaveRoom(this,function(err,result){
        self.release();
        cb(err,result);

    });

    /*this.release();
    cb();*/
};
//error 异常
Player.prototype.error = function (cb) {
    this.leaveRoom(function(){});
    logger.err('-----> ROOM error del user, name = '+ this.name);
    cb();
};
//心跳
Player.prototype.hearBeat = function () {

};

//返回对应的FrontServerId
Player.prototype.getFServer = function () {
    return this.fServerId;
};


/**
 * 技能
 * */
Player.prototype.useSkill = function (skillid, is, cb) {
    var info = global.skill[skillid];
    if(info != undefined && info.skill_name != undefined) {
        var strArr = info.skill_name.split('_');
        /// 判断使用的技能(狂暴)
        if (strArr[2] == "kuangbao") {
            this.useSkillCost = info.kuangbao_energy *1;
            if(is == false){
                this.useSkillCost = 1;
            }
        }else{
            var isOpenKBao = COMM.isUseSkillBySkillName(this.curUseSkillId, "kuangbao");
            if(isOpenKBao == false){
                this.useSkillCost = 1; /// 不是则还原
            }
        }
        if(is == false){
            delete this.curUseSkillId[skillid];
        }else {
            this.curUseSkillId[skillid] = strArr[2];
        }
        this.room.useSkill(this, skillid, is, this.useSkillCost);
        cb(null, skillid); return;
    }else{
        cb(1, null);
        return;
    }
};

/**
 * 开火
 * */
Player.prototype.fire = function (x, y, cb) {
    //检测是否可以开火
    if (!this.room) {
        //不在房间中
        cb(2001);return;
    }
    var cost = this.getFireCost();
    if (cost == null) {
        cb(2004);return;
    }
    if (!this.costOrAdd(cost.type, cost.value, 0)){
        cb(2003);return;
    }

    var fireId = ++this.fireCount;
    this.fireMap[fireId] = this.weapon; // 记录武器类型
    //充值系数金币池的变化
    var rechargecoefficient = this.rechargeCoefficient*1;
    if(rechargecoefficient != 0){
        this.costquotaPool = this.costquotaPool*1 + cost.value;
    }

    this.room.fire(this, x, y, cost.value);
    if (this.fireQueue.length >= 100) {
        //最多保存100个开火数据 超过就删除
        var id = this.fireQueue.shift();
        delete this.fireMap[id];
    }
    this.fireQueue.push(fireId);
    cb(null, {num:fireId, cost:cost.value,rechargeCoefficient:this.rechargeCoefficient,costquotaPool:this.costquotaPool,noviceCoefficient:this.noviceCoefficient});
};
/**
 * 特殊武器开火
 * */
Player.prototype.specialFire = function (weaponType, x, y, cb){
    if (!this.room) {
        //不在房间中
        cb(2001);return;
    }

    //console.log('---Normal----->Player.specialFire: ', weaponType, x, y, this.captureWeaponFish.fishType);
    if(this.captureWeaponFish.fishType *1 <= 0 || this.captureWeaponFish.fishType *1 != weaponType *1){
        //不在房间中
        cb(2002);return;
    }
    this.room.specialFire(this, x, y, weaponType);
    cb(null, {rechargeCoefficient:this.rechargeCoefficient,costquotaPool:this.costquotaPool,noviceCoefficient:this.noviceCoefficient});
};
//换位置
Player.prototype.changeSite = function (toSite, cb) {
    toSite--; //client的position是从1开始的
    var result = this.room.changeSite(this, toSite);
    cb(result, ++toSite);
};

//发送消息 实现为 带着uid FrontServerId 消息丢给发送队列
Player.prototype.sendMsg = function (pid, pName, data) {
    this.msgManager.addMsgOut(this.fServerId, [this.uid, pid, pName, data]);
};


Player.prototype.rpcMsg = function (pid, data) {//pid = 1,data={uid: player.uid}
    this.msgManager.addRpcOut(this.fServerId, [pid, this.uid, data]);
};

//更换武器 不在玩家剩余金币/弹药上进行检查 直接检测本房间是否可以更换
Player.prototype.changeWeapon = function (index, cb) {
    var result = this.room.changeWeapon(this, index);
    if (result) {
        this.weapon = global.getWeaponDataById(index);
    }
    cb(null);
};
//更换皮肤
Player.prototype.changeSkin = function (skinId, cb) {
    var result = this.room.changeSkin(this.uid, skinId);
    this.curSkinId = skinId;
    cb(null);
};
Player.prototype.getMatchRoomInfo= function (cb) {
    if (!this.room) {
        cb(1);return;
    }
    cb(null, this.room.typeId, this.room.roomId);
};

Player.prototype.guideSetCapture = function (guideCapture, cb) {
    if (!this.room) {
        cb(1);return;
    }
    this.guideCapture = guideCapture *1 || 0;
    //console.log('=0000==guideSetCapture==>guideCapture: ', guideCapture);
    cb(null);
}
Player.prototype.processMsg = function (cmd, data, cb) {

    try {
            data.push(cb);
            switch (cmd) {
                case "fire":
                    this.fire.apply(this, data);
                    break;
                case "useSkill":
                    this.useSkill.apply(this, data);
                    break;
                case "explosion":
                    this.explosion.apply(this, data);
                    break;
                case "coefficientCheck":
                    this.coefficientCheck.apply(this, data);
                    break;
                case "enterNormalRoom":
                    //进入普通房间 根据type
                    this.enterRoom.apply(this, data);
                    break;
                case 'changeSite':
                    this.changeSite.apply(this, data);
                    break;
                case 'leaveRoom':
                    this.leaveRoom.apply(this, data);
                    break;
                case 'changeWeapon':
                    this.changeWeapon.apply(this, data);
                    break;
                case 'changeSkin':
                    this.changeSkin.apply(this, data);
                    break;
                case 'subsidyReward':
                    this.subsidyReward.apply(this, data);
                    break;
                case 'purchase':
                    //console.log('---------purchase data', data);
                    this.purchase.apply(this, data);
                    break;
                case 'getMatchRoomInfo':
                    this.getMatchRoomInfo.apply(this, data);
                    break;
                case 'expression':
                    //console.log('expression data',data);
                    this.expression.apply(this, data);
                    break;
                case 'giftGive':
                    this.giftGive.apply(this, data);
                    break;
                case 'guideSetCapture':
                    this.guideSetCapture.apply(this, data);
                    break;
                case "specialFire":
                    this.specialFire.apply(this, data);
                    break;
                case "specialExplosion":
                    this.specialExplosion.apply(this, data);
                    break;
                case 'error':
                    logger.err('-----> processMsg ROOM error data',data);
                    this.error.apply(this, data);
                    break;
                default:
                    cb('error room server cmd ='+ cmd);
                    logger.err('error room server cmd ='+ cmd);
                    break;
            }
    }catch (e){
        logger.err('room server msg:' + e.stack || e.message);
    }
};

//----------------------本地调用---------------------------

var RES_TYPE_GOLD = 1;//消耗类型 金币
var RES_TYPE_GEM = 2;//消耗类型 宝石

var RES_TABLE = {};
RES_TABLE[RES_TYPE_GOLD] = 'gold';
RES_TABLE[RES_TYPE_GEM] = 'gem';

/**
 * 进入房间后初始化武器类型
 * 此方法由room在enterRoom成功时调用
 * @param index{int}初始的武器类型
 * */
Player.prototype.initWeaponType = function (weaponId) {
    this.weapon = global.getWeaponDataById(weaponId);
};

//根据当前武器返回一个消耗
Player.prototype.getFireCost = function () {
    var costType = RES_TYPE_GOLD;
    if (this.weapon == undefined || this.weapon == null) {
        logger.err('RoomServer.Player.getFireCost: invalid weapon.');
        return null;
    }
    var costValue = this.weapon.cost *1;

    /// 判断使用的技能(狂暴)
    var isOpenKBao = COMM.isUseSkillBySkillName(this.curUseSkillId, "kuangbao");
    if(isOpenKBao == true && this.useSkillCost > 0){
        costValue = costValue * this.useSkillCost *1; /// 消耗金币翻useSkillCost倍(最少是2)
    }
    /*
    * 当持有金币小于当前炮倍时，不做降炮处理，用当前炮倍把剩余金币打出去，
    * 实际计算倍数为剩余金币数，但是显示依然为当前炮倍
     */
    if(this.gold > 0 && this.gold < costValue){
        costValue = this.gold;
    }
    
    return {
        type: costType,
        value: costValue
    };
};

/**
 * 资源检测 传入类型的资源是否足够 消耗时进行检测
 * @param type{int} 资源类型
 * @param value{int} 资源数量
 * @return {boolean} 资源是否够
 * */
Player.prototype.checkRes = function (type, value) {
    return this[RES_TABLE[type]] >= value;
};

//破产补助
Player.prototype.subsidyReward = function (num, cb) {
    console.log('---------------------subsidyReward');
    var self = this;
    var room = this.room;
    if(room){
        self.gold = num;
        room.subsidyReward(self.uid,num,self.gem,self.coupon);
    }
    cb(null);
};
//战斗状态下购买物品同步
Player.prototype.purchase = function (gold,gem,rechargeCoefficient,costquota,cb) {
    this.gold += gold*1;
    this.gem += gem*1;
    if(rechargeCoefficient != undefined && costquota != undefined){
        this.rechargeCoefficient = rechargeCoefficient*1;
        this.costQuota = costquota;
    }
    cb(null);
};
//房间内聊天
Player.prototype.expression = function (messageId,messageContent,cb) {
    //console.log('---------------------messageId1,messageContent1',messageId,messageContent);
    var room = this.room;
    if(room) {
        room.expression(this,messageId,messageContent,cb);
    }
};

//房间内赠送礼物
Player.prototype.giftGive = function (id,uid,fid,cb) {
    var room = this.room;
    if(room) {
        room.giftGive(this,id,uid,fid,cb);
    }
};

//TODO 释放资源 并通知playerManager删除player
Player.prototype.release = function () {
    this.msgDispatcher.deletePlayer(this);
};

//----------------------------保存信息到db-------------
//TODO 将当前内存中的玩家信息保存到redis中
Player.prototype.save = function () {
    if(this.subsidyNum == null){
        this.subsidyNum = 0;
    }
    if(this.subsidyStartTime == null){
        this.subsidyStartTime = 0;
    }
    if(this.latelySubsidyTime == null){
        this.latelySubsidyTime = 0;
    }
    redis.hmset(REDIS_KEY_SUBSIDY + this.uid, {
        subsidyNum:this.subsidyNum,
        subsidyStartTime: this.subsidyStartTime,
        latelySubsidyTime: this.latelySubsidyTime
    }, function () {});
};