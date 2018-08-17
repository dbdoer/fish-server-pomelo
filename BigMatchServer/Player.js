/**
 * Created by Author.
 */

var COMM = require('../common/commons');
var logger = require("../common/logHelper").helper;
var RES_TYPE_GOLD = 1;  // 金币
var RES_TYPE_GEM = 2;   // 宝石
var RES_TYPE_INTEGRAL = 3; // 积分
var RES_TABLE = {};
RES_TABLE[RES_TYPE_GOLD] = 'gold';
RES_TABLE[RES_TYPE_GEM] = 'gem';
RES_TABLE[RES_TYPE_INTEGRAL] = 'integral';
var BROADCAST_ACCEPT_GOLD = 14;//领取金币

module.exports = Player;

function Player(uid, data, fServerId, selfRankInfo, msgManager, playerManager) {
    this.uid = uid;
    this.fServerId = fServerId;
    this.msgManager = msgManager;
    this.playerManager = playerManager;

    this.room = null;

    this.fireCount = 0;
    this.fireMap = {};
    this.fireQueue = [];//顺序保存fireId 超过100开始从头删除
    this.pos = -1;
    this.curUseSkillId = {};   ///当前使用的技能ID = {id:"name",..}
    this.useSkillCost = 1;    ///当前使用的技能金币的消耗
    this.bullet = selfRankInfo.bullet || 0; //子弹数
    //this.maxBullet = 2000; //用于比较
    this.integral = selfRankInfo.integral || 0;//当前分数
    this.maxIntegral = selfRankInfo.maxIntegral || 0;//最高分数
    this.curTaskFishNum = selfRankInfo.curTaskFishNum || 0;//任务鱼数
    this.fire_time = 0;
    this.captureWeaponFish = {};
    this.init(data);
}

/**
 * 初始化player对象
 * @param data{object} 从redis中获取的原始对象
 * */
Player.prototype.init = function (data) {
    if(data == undefined){
        console.log('==Err==>Init Data == undefined!!');
        return;
    }
    this.name = data.nickname;
    this.gold = data.gold*1;
    this.gem = data.gem*1;
    this.headurl = data.headImage;
    this.showId = data.outsideUuid;
    this.curSkinId = data.curSkinId;
    this.vipLv = data.vipLv*1 || 0;
    this.level =  data.level*1;
    this.experience =  data.experience*1;
};
/**
 *
 * @param matchInfo
 */
Player.prototype.setMatch = function(matchInfo){
    this.match = matchInfo;
}
/**
 * 进入房间后初始化武器类型
 * 此方法由room在join成功时调用
 * @param index{int}初始的武器类型
 * */
Player.prototype.initWeaponType = function (weaponId) {
    this.weapon = global.getWeaponDataById(weaponId);
};

/**
 * 加入房间
 * */
Player.prototype.join = function (matchId, cb) {

    //console.log("==Player join==>matchId: ", matchId);
    var result = this.match.enterRoom(this);
    this.room = result.room;
    this.pos = this.room.playerPos.indexOf(this);

    var info = result.room.getRoomInfo(); //需要发还给FrontServer 并转给client
    cb(null, info);
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
        weaponId: this.weapon.weapon_index *1,
        skinType: this.curSkinId || 10109,
        name: this.name || 'sth',
        coupon: 0,
        energy: 0,
        optimalComScore: 0,
        showId: this.showId || 0,
        bullet: this.bullet,
        curTaskFishNum: this.curTaskFishNum,
        curUseSkill: tempUseSkill || ""
    };
};

Player.prototype.getPos = function () {
    return this.pos + 1;//客户端position从1开始
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
 * 资源检测 传入类型的资源是否足够 消耗时进行检测
 * @param type{int} 资源类型
 * @param value{int} 资源数量
 * @return {boolean} 资源是否够
 * */
Player.prototype.checkRes = function (type, value) {
    return this[RES_TABLE[type]] >= value;
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
    //console.log('=BigMatch==>Explosion data: ', data, this.fireMap[fireId]);
    var tempWeapon = this.weapon;
    if (tempFullCapture == undefined || tempBombValue == undefined) {
        console.log('explosion can not find fire info');
        cb(101); return;
    }

    if(tempFullCapture == 0 && this.fireMap[fireId] == undefined ){
        console.log('explosion can not find fire info');
        cb(101); return;
    }
    if(tempWeapon == undefined){
        console.log('explosion can not find weapon info');
        cb(102); return;
    }
    var gold = 0;
    var addIntegral = 0;
    var tempDropList = {};
    var l_levelReward = undefined;
    if (data.fishid.length > 0) {
        var str = this.room.explosion(this, tempWeapon, data.fishid, tempFullCapture, tempBombValue);
        addIntegral = parseInt(str.addIntegral);
        var tempDeadFish = str.deadFish || [];
        for (var k = 0; k < tempDeadFish.length; k++) {
            if(tempDeadFish[k]== undefined){ continue; }
            //console.log("---222---->> tempDeadFish[k].gold: ",tempDeadFish[k].gold);
            gold += tempDeadFish[k].gold *1 || 0;
        }
        //gold = parseInt(str.addGold);
        /// 玩家等级升级的奖励
        if(str.levelReward != undefined){
            console.log("---222---->> levelReward: ",gold, str.levelReward.number, this.gold);
            if(str.levelReward.type*1 == 1){/// 金币
                gold += str.levelReward.number *1 || 0;
            }
            l_levelReward = str.levelReward;
        }

        tempDropList = str.list || {};
        if (addIntegral > 0) {
            this.costOrAdd(RES_TYPE_GOLD, gold, 1);
            this.costOrAdd(RES_TYPE_INTEGRAL, addIntegral, 1);
        }
    }
    delete this.fireMap[fireId];

    ////判断子弹数<=0时触发结算消息
    if(this.bullet <= 0 && Object.keys(this.fireMap).length <= 0){
        if(this.maxIntegral < this.integral){
            this.maxIntegral = this.integral;
        }

        //console.log("==4274==>this.maxIntegral,this.integral = ", this.maxIntegral,this.integral);
        this.sendMsg(4274, "SC_Big_Match_Settlement", {curScore: this.integral *1,maxScore: this.maxIntegral *1})
    }
    cb(null, {gold: gold, score: addIntegral, list: tempDropList, levelReward: l_levelReward});
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

    var tempSurEnergy = (global.specialInfo.ztp_residual_energy*1 ) * this.room.scene.totalWeaponEnergy;
    if(finalExplode == 0 && this.room.scene.weaponFishEnergy < tempSurEnergy){
        console.log('==BigMatch==>weaponFishEnergy: %s < %s ,fishIds: %s',this.room.scene.weaponFishEnergy, tempSurEnergy,fishidlist);
        cb(101); return;
    }

    var gold = 0;
    var addIntegral = 0;
    var tempDropList = {};
    var l_levelReward = undefined;
    if (fishidlist.length > 0) {
        var str = this.room.explosion(this, this.captureWeaponFish.weaponInfo, fishidlist, 0, 0, finalExplode);
        addIntegral = parseInt(str.addIntegral);
        var tempDeadFish = str.deadFish || [];
        for (var k = 0; k < tempDeadFish.length; k++) {
            if(tempDeadFish[k]== undefined){ continue; }
            gold += tempDeadFish[k].gold *1 || 0;
        }
        //gold = parseInt(str.addGold);
        /// 玩家等级升级的奖励
        if(str.levelReward != undefined){
            console.log("---222---->> levelReward: ",gold, str.levelReward.number, this.gold);
            if(str.levelReward.type*1 == 1){/// 金币
                gold += str.levelReward.number *1 || 0;
            }
            l_levelReward = str.levelReward;
        }

        tempDropList = str.list || {};
        if (addIntegral > 0) {
            this.costOrAdd(RES_TYPE_GOLD, gold, 1);
            this.costOrAdd(RES_TYPE_INTEGRAL, addIntegral, 1);
        }
        if(finalExplode == 1){
            this.captureWeaponFish = {}; ///结束后清空数据
        }
    }

    cb(null, {gold: gold, score: addIntegral, list: tempDropList, levelReward: l_levelReward});
};
//
Player.prototype.leaveRoom = function (cb) {
    var self = this;
    if (this.room == undefined || this.room == null) {
        cb(1001, null);
        return;
    }

    this.room.leaveRoom(this,function(err,result){
        self.release();
        cb(err,result);
    });
    //this.release();
    //cb();
};

//error 异常
Player.prototype.error = function () {
    this.leaveRoom(function(){});
    console.log('----------------BIG error del user ----------------');
};

//返回对应的FrontServerId
Player.prototype.getFServer = function () {
    return this.fServerId;
};

/**
 * 开火
 * */
Player.prototype.fire = function (x, y, cb) {

    if (!this.room) {
        //不在房间中
        cb(101);return;
    }
    if (this.bullet <= 0)
    {/// 提示子弹用光
        cb(102);return;
    }
    var cost = this.weapon.cost *1;
    /*
     * 当持有金币小于当前炮倍时，不做降炮处理，用当前炮倍把剩余金币打出去，
     * 实际计算倍数为剩余金币数，但是显示依然为当前炮倍
     */
    if(this.gold > 0 && this.gold < cost){
        cost = this.gold;
    }
    var costBullet = 1;
    /// 判断使用的技能(狂暴)
    var isOpenKBao = COMM.isUseSkillBySkillName(this.curUseSkillId, "kuangbao");
    if(isOpenKBao == true && this.useSkillCost > 0){
        cost = cost * this.useSkillCost *1; /// 消耗金币翻useSkillCost倍(最少是2)
        costBullet = costBullet * this.useSkillCost *1; /// 消耗子弹翻useSkillCost倍(最少是2)
    }
    if (this.bullet < costBullet)
    {/// 提示子弹不足以使用狂暴
        cb(103);return;
    }

    //this.weapon.multiple = cost;   //注于5月7号，会否造成其他影响待后续进一步验证

    //console.log("--222221-----Player--fire: ",cost, this.gold);
    if(this.costOrAdd(RES_TYPE_GOLD, cost, 0) == false){
        cb(103);return;
    }
    //console.log("--222222-----Player--fire: ", this.gold);

    this.bullet -= costBullet;
    var fireId = ++this.fireCount;
    this.fireMap[fireId] = true;
    this.room.fire(this, x, y);
    if (this.fireQueue.length >= 100) {
        //最多保存100个开火数据 超过就删除
        var id = this.fireQueue.shift();
        delete this.fireMap[id];
    }
    this.fireQueue.push(fireId);
    //cb(null, fireId);
    cb(null, {num:fireId, cost:cost});
};

/**
 * 特殊武器开火
 * */
Player.prototype.specialFire = function (weaponType, x, y, cb){
    if (!this.room) {
        //不在房间中
        cb(2001);return;
    }

    //console.log('---BigMatch----->Player.specialFire: ', weaponType, x, y, this.captureWeaponFish.fishType);
    if(this.captureWeaponFish.fishType *1 <= 0 || this.captureWeaponFish.fishType *1 != weaponType *1){
        cb(2002);return;
    }

    this.room.specialFire(this, x, y, weaponType);
    cb(null, {});
};

//发送消息 实现为 带着uid FrontServerId 消息丢给发送队列
Player.prototype.sendMsg = function (pid, pName, data) {
    this.msgManager.addMsgOut(this.fServerId, [this.uid, pid, pName, data]);
};

Player.prototype.rpcMsg = function (pid, data) {
    this.msgManager.addRpcOut(this.fServerId, [pid, this.uid, data]);
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
//更换皮肤
Player.prototype.changeSkin = function (skinId, cb) {
    var result = this.room.changeSkin(this.uid, skinId);
    this.curSkinId = skinId;
    cb(null);
};

Player.prototype.processMsg = function (cmd, data, cb) {
    //console.log("FAST MATCH SERVER --- cmd = "+ cmd +"     data = "+ JSON.stringify(data));
    data.push(cb);
    switch (cmd) {
        case "useSkill":
            this.useSkill.apply(this, data);
            break;
        case "fire":
            this.fire.apply(this, data);
            break;
        case "explosion":
            this.explosion.apply(this, data);
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
        case 'expression':
            this.expression.apply(this, data);
            break;
        case 'leaveRoom':
            this.leaveRoom.apply(this, data);
            break;
        case 'join':
            //console.log('=Player==processMsg==>data: ',data);
            this.join.apply(this, data);
            break;
        case "specialFire":
            this.specialFire.apply(this, data);
            break;
        case "specialExplosion":
            this.specialExplosion.apply(this, data);
            break;
        case 'error':
            this.error.apply(this, data);
            break;

    }
};
//破产补助
Player.prototype.subsidyReward = function (num) {
    console.log('---------------------subsidyReward');
    var self = this;
    var room = this.room;
    if(room){
        self.gold = num;
        room.subsidyReward(self.uid,num,self.gem,self.coupon);
    }
};
//战斗状态下购买物品同步
Player.prototype.purchase = function (gold,gem) {
    this.gold += gold*1;
    this.gem += gem*1;
};
//房间内聊天
Player.prototype.expression = function (messageId,messageContent,cb) {
    //console.log('---------------------messageId1,messageContent1',messageId,messageContent);
    var room = this.room;
    if(room) {
        room.expression(this,messageId,messageContent,cb);
    }
};
//----------------------本地调用---------------------------

// 释放资源 并通知playerManager删除player
Player.prototype.release = function () {
    this.playerManager.deletePlayer(this);
};