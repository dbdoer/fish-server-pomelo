/**
 * Created by Author.
 */

var COMM = require('../common/commons');
var logger = require("../common/logHelper").helper;
var RES_TYPE_GOLD = 1;//消耗类型 金币
var RES_TYPE_GEM = 2;//消耗类型 宝石
var RES_TABLE = {};
RES_TABLE[RES_TYPE_GOLD] = 'gold';
RES_TABLE[RES_TYPE_GEM] = 'gem';

module.exports = Player;

function Player(uid,  fServerId, roomManager, msgManager, playerManager) {
    this.uid = uid;
    this.fServerId = fServerId;
    this.roomManager = roomManager;
    this.msgManager = msgManager;
    this.playerManager = playerManager;

    this.room = null;

    this.fireCount = 0;
    this.fireMap = {};
    this.fireQueue = [];//顺序保存fireId 超过100开始从头删除
    this.pos = -1;
    this.bullet = 0; //子弹数
    //this.signUpCost = 0; //参加比赛的报名费
    this.curUseSkillId = {};   ///当前使用的技能ID = {id:"name",..}
    this.useSkillCost = 1;    ///当前使用的技能子弹的消耗
    this.captureWeaponFish = {};

    this.curTaskFishNum = 0; /// 当前任务鱼数量
    this.flagRobot = false;
    this.msgDisable = false;
    // this.init();
}

/**
 * 初始化player对象
 * @param data{object} 从redis中获取的原始对象
 * */
Player.prototype.init = function (data) {

    this.name = data.nickname;
    this.gold = data.gold;
    this.gem = data.gem;
    this.headurl = data.headImage;
    this.FBheadImage = data.FBheadImage;
    this.FBnickname = data.FBnickname;
    this.showId = data.outsideUuid;
    this.vipLv = data.vipLv || 0;
    this.score = 0;//分数
    this.curSkinId = data.curSkinId || 10109;
    this.costType = data.costType || 1;
    //console.log("fast match ---------        data = %s", JSON.stringify(data));

};

Player.prototype.setMatch = function (match) {
    if(this.match != undefined){
        this.match = null;
    }
    this.match = match;
    // 初始化规则
    var tableInfo = global.compConfig[this.match.type];
    if(tableInfo === undefined){
        console.log('=Player setMatch==> tableInfo === undefined')
        return ;
    }
    this.bullet = tableInfo.ammo_number *1;
    //this.signUpCost = tableInfo.competition_cost *1;
};

/**
 * 加入房间
 * */
Player.prototype.join = function (matchId, data, cb) {

    if(!matchId || !this.match || !this.match.matchId){
        cb(1, null);
        return ;
    }
    if (matchId != this.match.matchId) {
        //TODO 根据matchId找match
        console.log('====>Player Join==> matchId != this.match.matchId');
        cb(2, null);
        return;
    }

    this.init(data);

    var result = this.match.join(this.uid);
    if(result == undefined || result == null){
        cb(3, null);
        return;
    }

    this.room = result.room;
    this.pos = this.room.playerPos.indexOf(this);

    if(!this.isRobot()){
        /*if(!this.costOrAdd(RES_TYPE_GOLD, this.signUpCost, 0)){
            console.log('====>Player Join==>costOrAdd = false');
        }*/
    }

    cb(null, {
        userList: result.playerList,
        taskFishReward: result.taskFishReward,
        targetTaskFishNum: result.targetTaskFishNum,
        taskFishType: result.taskFishType,
        curFishFarmId: this.room.fishFarmId,
        errCode: 0
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
        weaponId: 0,
        skinType: this.curSkinId || 10109,
        name: this.name || 'sth',
        coupon: 0,
        energy: 0,
        optimalComScore: 0,
        showId: this.showId || 0,
        bullet: this.bullet,
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
    var isOk = this.checkRes(type, value);
    //console.log('====>Player costOrAdd==>gold, value, useType = ', this[RES_TABLE[type]],value,useType);
    if (isOk === undefined || !isOk) {
        return false;
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
    //console.log('=FastMatch==>Explosion data: ', data);
    if (tempFullCapture == undefined|| tempBombValue == undefined) {
        console.log('explosion can not find fire info');
        cb(101); return ;
    }
    if(tempFullCapture == 0 && this.fireMap[fireId] == undefined ){
        console.log('explosion can not find fire info');
        cb(101); return;
    }
    var ret = {score:0, list:{}};
    var tableInfo = global.compConfig[this.match.type];
    var weaponData = global.getWeaponDataById(tableInfo.competition_weapon_id);
    var wMultiple = 0;
    if(weaponData == undefined){
        wMultiple = 1;
    }else{
        wMultiple = weaponData.multiple *1;
    }

    if (data.fishid.length > 0) {
        var revenue  = this.room.explosion(this, wMultiple, data.fishid, tempFullCapture, tempBombValue);
        //console.log('get score = ' + score +',wMultiple = '+ wMultiple);
        this.score += revenue.worth;
        this.score += revenue.task;

        ret.score += revenue.worth;
        ret.score += revenue.task;
        ret.list = revenue.list || {};
        this.match.onPlayerScoreChanged(this);
    }
    delete this.fireMap[fireId];
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

    var tempSurEnergy = (global.specialInfo.ztp_residual_energy*1 ) * this.room.scene.totalWeaponEnergy;
    if(finalExplode == 0 && this.room.scene.weaponFishEnergy < tempSurEnergy){
        console.log('==FastMatch==>weaponFishEnergy: %s < %s, fishIds: %s',this.room.scene.weaponFishEnergy, tempSurEnergy,fishidlist);
        cb(101); return;
    }

    var ret = {score:0, list:{}};
    if (fishidlist.length > 0) {
        var revenue = this.room.explosion(this, this.captureWeaponFish.weaponInfo, fishidlist, 0, 0, finalExplode);
        this.score += revenue.worth;
        this.score += revenue.task;

        ret.score += revenue.worth;
        ret.score += revenue.task;
        ret.list = revenue.list || {};
        this.match.onPlayerScoreChanged(this);

        if(finalExplode == 1){
            this.captureWeaponFish = {}; ///结束后清空数据
        }
    }

    cb(null, ret);
};
//离开房间后不可以再次进入房间*修改成可以进入* 目前比赛开始后前端不调用此接口
Player.prototype.leaveRoom = function (cb) {
    this.msgDisable = true;

    if (this.room == undefined || this.room == null) {
        cb(1001, null);
        return;
    }

    var tableInfo = global.compConfig[this.match.type];
    var isMatchStart;
    //只有未开始退出才做真正的退出逻辑
    if(this.match.timeCounter == tableInfo.competition_length *1 && this.room.status != 2) {
        /*/// 退出房间后返回报名费
        if(!this.costOrAdd(RES_TYPE_GOLD, this.signUpCost, 1)){
        }*/

        this.room.leaveRoom(this);
        this.release();
        isMatchStart = false;
    }else{
        /// 比赛进行中退出房间时,捕获到道具鱼(钻头炮)后的处理
        isMatchStart = true;
        //console.log('=====FastMath.leaveRoom==> ',this.captureWeaponFish, this.match.type);
        if(this.captureWeaponFish != undefined && Object.keys(this.captureWeaponFish).length >0){
            this.room.setSpceialWeaponFish(this.uid);
            this.captureWeaponFish = {};
        }
    }

    cb(null, {isMatchStart: isMatchStart, matchType: this.match.type, costType: this.costType});
};


//error 异常
Player.prototype.error = function () {
    this.leaveRoom(function(){});
    console.log('----------------error del user----------------%s', this.msgDisable);
};

//返回对应的FrontServerId
Player.prototype.getFServer = function () {
    return this.fServerId;
};

/**
 * 开火
 * */
Player.prototype.fire = function (x, y, cb) {
    if (this.bullet <= 0)
    {/// 提示子弹用光
        cb(200);return;
    }
    var costBullet = 1;
    /// 判断使用的技能(狂暴)
    var isOpenKBao = COMM.isUseSkillBySkillName(this.curUseSkillId, "kuangbao");
    if(isOpenKBao == true && this.useSkillCost > 0){
        costBullet = costBullet * this.useSkillCost *1; /// 消耗子弹翻useSkillCost倍(最少是2)
    }
    if (this.bullet < costBullet)
    {/// 提示子弹不足以使用狂暴
        cb(200);return;
    }
    if (!this.room) {
        //不在房间中
        cb(201);
        return;
    }
    //检测是否可以开火
    if (!this.room.canFire()) {
        //房间不可开火
        cb(202);return;
    }
    this.bullet -= costBullet;

    if(!this.isRobot()){
        //console.log('=Player Fire==>bullet: ',this.bullet)
    }

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
    cb(null, {num:fireId, cost:0});
};

/**
 * 特殊武器开火
 * */
Player.prototype.specialFire = function (weaponType, x, y, cb){
    if (!this.room) {
        //不在房间中
        cb(2001);return;
    }

    //console.log('---FastMatch----->Player.specialFire: ', weaponType, x, y, this.captureWeaponFish.fishType);
    if(this.captureWeaponFish.fishType *1 <= 0 || this.captureWeaponFish.fishType *1 != weaponType *1){
        cb(2002);return;
    }

    this.room.specialFire(this, x, y, weaponType);
    cb(null, {});
};
//发送消息 实现为 带着uid FrontServerId 消息丢给发送队列
Player.prototype.sendMsg = function (pid, pName, data) {
    //robot 不发消息
    if(this.isRobot()){
        return;
    }
    if(this.msgDisable){
        return;
    }

    this.msgManager.addMsgOut(this.fServerId, [this.uid, pid, pName, data]);
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
        cb(null, skillid);
        return;
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

//战斗状态下购买物品同步
Player.prototype.purchase = function (gold,gem) {
    this.gold += gold*1;
    this.gem += gem*1;
};
/**
 * 比赛排名信息
 * */
Player.prototype.getRank = function (mid, cb) {
    var match = this.match;
    if(match){
        cb(null, match.getRankTopN(8));
    }else{
        cb("no match", null);
    }
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
    //console.log('**************************uid,giftId',uid,giftId);
    var room = this.room;
    if(room) {
        room.giftGive(this,id,uid,fid,cb);
    }
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
        case 'expression':
            //console.log('expression data',data);
            this.expression.apply(this, data);
            break;
        case 'purchase':
            //console.log('---------purchase data', data);
            this.purchase.apply(this, data);
            break;
        case 'giftGive':
            //console.log('expression data',data);
            this.giftGive.apply(this, data);
            break;
        case 'leaveRoom':
            this.leaveRoom.apply(this, data);
            break;
        case 'join':
            //console.log('=Player==processMsg==>data: ',data);
            this.join.apply(this, data);
            break;
        case 'error':
            this.error.apply(this, data);
            break;
        case 'getRank':
            this.getRank.apply(this, data);
            break;
        case "specialFire":
            this.specialFire.apply(this, data);
            break;
        case "specialExplosion":
            this.specialExplosion.apply(this, data);
            break;
    }
};

//----------------------本地调用---------------------------

// 释放资源 并通知playerManager删除player
Player.prototype.release = function () {
    this.playerManager.deletePlayer(this);
};

Player.prototype.setRobotFlag = function () {
    this.flagRobot = true;
}

Player.prototype.isRobot = function () {
    return this.flagRobot? true: false;
}


Player.prototype.reConnect = function () {
    this.msgDisable = false;
}

