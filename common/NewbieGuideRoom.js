"use strict";
/**
 * Created by xiahoutangjian on 2016/12/2.
 * 负责新手引导相关步骤操作
 */

var Emitter = require('events').EventEmitter;
var util = require("util");
var uuid = require("uuid");
var logger = require("./logHelper").helper;
var EVENT_CLOSE = "close";
var EVENT_ENTER = "enter";
var EVENT_LEAVE = "leave";

//广播类型 玩家动作
var BROADCAST_ENTER = 1;//玩家进入房间
var BROADCAST_LEAVE = 2;//玩家离开房间
var BROADCAST_FIRE = 3;//开火
var BROADCAST_CHANGE_SITE = 4;//换座
var BROADCAST_USE_SKILL = 5;//使用技能
var BROADCAST_SYNC_TRACK_RESET = 6;//同步路径
var BROADCAST_SYNC_TRACK_TIME = 7;//同步track_time
var BROADCAST_CHANGE_WEAPON = 8;//换武器
var BROADCAST_CHANGE_SKIN = 9;//换皮肤
var BROADCAST_PROPDATA_DROP = 10;//物品掉落
var BROADCAST_UP_GRADE = 11;//升级
var BROADCAST_TASKFISH_REWARD = 12;//彩金结果统计
var BROADCAST_CAPTURE = 13;//碰撞广播
var BROADCAST_BOMB_LOCKSCREEN = 14;//全屏捕获锁屏

var REFRESH_TRACK_INTERVAL = 1000;
var commons = require('./commons');
var FishManager = require('./FishManager');
var Other = require('../Resources/other.json')["1"];


//sceneManager, this, options
module.exports = function () {
    return new NewbieGuide();
};

function NewbieGuide() {
    logger.info("NewbieGuide: entered.");

    this.fishManager = FishManager();
    this.allFishFarmTrackIds = {1:[global.guideInfo.Guide_trackid]};
    this.fishManager.resetScreensByTracks(this.allFishFarmTrackIds);//重置所有屏幕
    this.isTrackReset = false;
    this.curScreenId = 0;  /// 控制当前出现那屏鱼
    this.roomId = uuid.v1();//房间唯一识别id
    this.time = 0;// room已经存在的时间
    this.playerPos = [-1,-1,-1,-1,-1,-1,-1,-1];//玩家位置表 元素对应玩家 index表示位置 0 ~ size-1
    this.life_time = 0;
    this.kickListOnTimeOut = [];  ///超时踢掉的人
    this.taskFishNum = 0;  /// 任务鱼条数
    this.explosionFishNum = {};  /// 特殊鱼碰撞次数
    this.bombLockScreenTime = 0;
    var specialFishTypes = global.guideInfo.Guide_fishtype.split("|") || [];//19,47,43,42 鲨鱼，金鱼，火龙，全屏
    var explosionMinNum = global.guideInfo.Guide_deadnum_min.split("|") || [];//1,3,3,7
    var explosionMaxNum = global.guideInfo.Guide_deadnum_max.split("|") || [];//1,3,3,7
    //控制特殊鱼的碰撞次数依次为1,3,3,7次
    for(var s = 0; s < specialFishTypes.length; s++){
        if(specialFishTypes[s] != undefined){
            var tempNum = commons.INRANGE_RANDOM(explosionMinNum[s]*1, explosionMaxNum[s] *1)//1 3 3 7
            if(this.explosionFishNum[specialFishTypes[s]] == undefined){
                this.explosionFishNum[specialFishTypes[s]] = {total:tempNum, curNum: 0};
            }
        }
    }

    var self = this;
    this.refreshInterval = setInterval(function () {
        self.update();
    }, REFRESH_TRACK_INTERVAL); //RoomGuide 定时器

    logger.info("NewbieGuide: leaved.");
}

util.inherits(NewbieGuide, Emitter);

//由一个server实例统一的定时器进行调用
NewbieGuide.prototype.update = function () {
    this.life_time ++;
    //this.kickUserOverTime();
    //不锁屏
    if(this.bombLockScreenTime == 0) {
        if (this.isTrackReset == true) {
            // 广播path重置
            var path = this.fishManager.getOneScreenByTrackId(global.guideInfo.Guide_trackid * 1, this.curScreenId);
            path = [path];
            this.broadcast(BROADCAST_SYNC_TRACK_RESET, {tracks: path});
            this.isTrackReset = false;
        }
    }else {
        if (this.bombLockScreenTime > 0) {
            this.bombLockScreenTime++;
            if (this.bombLockScreenTime >= 8) {
                this.bombLockScreenTime = 0;
                this.broadcast(BROADCAST_BOMB_LOCKSCREEN, {isLockScreen: this.bombLockScreenTime});
            }
        }
    }
};

//超时T出房间n
NewbieGuide.prototype.kickUserOverTime = function () {
    for(var k = 0; k< this.kickListOnTimeOut.length; k++){
        this.kickRoom(this.kickListOnTimeOut[k]);
        this.kickListOnTimeOut.splice(k, 1);  /// T除一个,缓存就要清除一个
    }

    var self = this;
    var list = self.playerPos;
    for(var k in list ){
        var p = list[k];
        if(p && p !=-1){
            if(self.life_time - p.fire_time > Other['kicked_overtime']){
                self.kickListOnTimeOut.push(p);
                self.broadcast(BROADCAST_LEAVE, {uid: p.uid, kicked:true});
            }
        }
    }
}
//T 人
NewbieGuide.prototype.kickRoom = function (player) {
    if(!player || player == -1){
        console.log("--==> NewbieGuide KickRoom ERR, player = ", player);
        return;
    }
    var pos = this.playerPos.indexOf(player);
    if(pos < 0 || pos > this.playerPos.length -1){
        return;
    }
    this.playerPos[pos] = -1;
    if(this.refreshInterval != undefined)
        clearInterval(this.refreshInterval);

};

//房间内广播 根据type分配pid pName
NewbieGuide.prototype.broadcast = function (type, data, except) {
    //console.log('-----broadcast type='+type);
    if (!except)except = []; //除外规则 不广播谁
    var pid = -1;
    var pName;
    for (var k in this.playerPos) {
        var p = this.playerPos[k];
        if (p == -1) {
            continue;
        }

        switch (type) {
            case BROADCAST_UP_GRADE:{
                pid = 4120;
                pName = 'SC_BroadcastLevelUp';///广播升级
            }break;
            case BROADCAST_ENTER:
                pid = 4203;
                pName = 'SC_BroadcastEnterRoom';
                break;
            case BROADCAST_FIRE:
                pid = 4208;
                pName = null;
                break;
            case BROADCAST_USE_SKILL:
                pid = 4602;
                pName = 'SC_BroadcastUseSkill';
                break;
            case BROADCAST_LEAVE:
                pid = 4206;
                pName = 'SC_BroadcastLeaveRoom';
                break;
            case BROADCAST_CAPTURE:{
                pid = 4210;
                pName = null;
            }break;
            case BROADCAST_SYNC_TRACK_RESET:
                pid = 4211;
                pName = 'Pathinfo';
                break;
            case BROADCAST_SYNC_TRACK_TIME:
                pid = 4212;
                pName = 'SC_SynchTrackTime';
                break;
            case BROADCAST_CHANGE_SITE:
                pid = 4263;
                pName = 'SC_BroadcastChangeSite';
                break;
            case BROADCAST_CHANGE_WEAPON:
                pid = 4231;
                pName = 'SC_BroadcastChangeWeapon';
                break;
            case BROADCAST_TASKFISH_REWARD:{
                pid = 4270;
                pName = 'SC_BroadcastClassicRstInfo';///彩金结果统计
            }break;
            case BROADCAST_CHANGE_SKIN:{
                pid = 4229;
                pName = 'SC_BroadcastSkinChange';///皮肤更换
            }break;
            case BROADCAST_PROPDATA_DROP:{
                pid = 4226;
                pName = 'SC_BroadcastDropData';///广播物品掉落
            }break;
            case BROADCAST_BOMB_LOCKSCREEN:{
                pid = 4311;
                pName = 'SC_BroadcastBombLockScreen';///炸弹Boss锁屏
            }break;
            default:
                break;
        }
    }
    if (pid < 0)return;

    for (var k in this.playerPos) {
        if (this.playerPos[k] != -1 && except.indexOf(this.playerPos[k]) == -1) {
            //console.log('====playerPos[k].sendMsg==>\n fServerId: %s,pid: %s, pName: %s, data: %s', this.playerPos[k].fServerId,pid, pName, JSON.stringify(data))
            this.playerPos[k].sendMsg(pid, pName, data);
        }
    }
};

//进入房间
NewbieGuide.prototype.enterRoom = function (player){
    logger.info("NewbieGuide.enterRoom: entered.");
    var temp_pos = 1;
    if(player != undefined){
        this.playerPos[temp_pos] = player;  ///指定坐在第二个位置
    }

    var tempWeapon = global.guideInfo.Guide_weaponid || '0';
    tempWeapon = tempWeapon.split("|");
    var weaponid = tempWeapon[0] *1 || 0;
    if(player.curGuideStep > global.guideStepDetail.HuoLongDead ){
        weaponid = tempWeapon[1] *1 || 0;
    }
    var weapon = global.getWeaponData(weaponid).weapon_id *1;
    player.initWeaponType(weapon); //一定要放在广播BROADCAST_ENTER消息前面

    /// 根据当前引导步骤选择那屏鱼出现
    if(player.curGuideStep *1 > global.guideStepDetail.SharkDead &&
        player.curGuideStep *1 <= global.guideStepDetail.TaskFishDead){
        this.curScreenId = global.guideStepDetail.TaskFishDead -1;
    }
    else if(player.curGuideStep *1 > global.guideStepDetail.TaskFishDead &&
        player.curGuideStep *1 <= global.guideStepDetail.HuoLongDead){
        this.curScreenId = global.guideStepDetail.HuoLongDead -1;
    }
    else if(player.curGuideStep *1 > global.guideStepDetail.HuoLongDead &&
        player.curGuideStep *1 <= global.guideStepDetail.BombFishDead){
        this.curScreenId = global.guideStepDetail.BombFishDead -1;
    }
    player.pos = temp_pos;
    this.broadcast(BROADCAST_ENTER, {
        userInfo: player.getUserInfo()
    }); // 向房间内所有玩家进行广播
    this.emit(EVENT_ENTER, player.uid);
    player.fire_time = this.life_time;
    logger.info("NewbieGuide.enterRoom: leaved.");
    return 0;
};

//退出房间
NewbieGuide.prototype.leaveRoom = function (player,cb) {
    var pos = this.playerPos.indexOf(player);
    if(pos < 0 || pos > this.playerPos.length -1){
        cb(1, null);return;
    }
    this.playerPos[pos] = -1;
    if(this.refreshInterval != undefined)
        clearInterval(this.refreshInterval);

    this.emit(EVENT_CLOSE, this.roomId);
    this.broadcast(BROADCAST_LEAVE, {uid: player.uid});


    cb(null,{level:player.level,experience:player.experience});
};

//开火
NewbieGuide.prototype.fire = function (player, x, y) {
    if(player == undefined){
        return;
    }
    this.broadcast(BROADCAST_FIRE, [player.getPos(), x, y], [player]);
    //console.log('=====>NewbieGuide.prototype.fire = ',x, y)
    //更新开火时间
    player.fire_time = this.life_time;
};

//碰撞
NewbieGuide.prototype.explosion = function (player, weapon, fishes, isFullCapture) {

    var result = this.newbieCapture(fishes, weapon, player.guideCapture,isFullCapture);
    result.gold = 0;
    if (result.deadFish.length > 0) {
        var totalGold = 0;  /// 记录此次能获得经验值
        for(var i = 0; i<result.deadFish.length; i++) {
            //根据类型获取鱼的基础配置信息
            var fishType = this.fishManager.getFishTypeById(result.deadFish[i].fishId);
            var fishInfo = global.getFishInfoByIndex(fishType);
            //console.log("-------------------fishType2,fishInfo2",fishType,fishInfo);
            if (fishInfo == undefined) {
                continue;
            }
            totalGold += fishInfo.gold*1;
            /// 记录彩金系统的任务鱼条数
            if(fishType *1 == global.guideInfo.Guide_taskfishid*1){
                this.taskFishNum += 1;
                //// 满足条数后发放奖励
                if(this.taskFishNum >= global.guideInfo.Guide_taskfish_num *1){
                    var rewardGold = global.guideInfo.Guide_bonus *1;
                    var rewardId = 5;  ///指定彩金奖励ID
                    //result.gold = rewardGold; // *移到newbieGudieHandler文件内添加*
                    this.broadcast(BROADCAST_TASKFISH_REWARD,{
                        matchType: 10,
                        reward: rewardGold,
                        rewardId: rewardId,
                        position: player.getPos(),
                        newGoldPool: rewardGold});
                }
            }
            if(fishInfo.name == "bomb"){
                this.bombLockScreenTime = 1;
                player.setBombWeapon(weapon);
                this.broadcast(BROADCAST_BOMB_LOCKSCREEN, {isLockScreen: this.bombLockScreenTime});
            }
            var tempFish = this.explosionFishNum[fishType];
            if(tempFish != undefined && player.curGuideStep < global.guideStepDetail.RewardGiftbag){
                player.curGuideStep = player.curGuideStep *1 +1;
                player.guideCapture = 0;
                if(player.curGuideStep < global.guideStepDetail.RewardGiftbag)
                    this.isTrackReset = true;

                this.curScreenId += 1;
                if(fishType *1 == 43){
                    player.guideCapture = 4;
                }
            }
        }

        /// 判断是否升级
        if(totalGold > 0) {
            player.experience = player.experience * 1 + totalGold;
            var newLevelInfo = global.getLevelByExperience(player.experience);
            if (player.level < newLevelInfo.level) {
                player.level = newLevelInfo.level;
                player.noviceCoefficient = newLevelInfo.noviceCoefficient;
                result.levelReward = {type: newLevelInfo.reward_type, number: newLevelInfo.reward_num};
                this.broadcast(BROADCAST_UP_GRADE, {playerIndex: player.pos + 1, level: player.level, experience: player.experience});
            }
        }
        this.broadcast(BROADCAST_CAPTURE, [player.getPos(), result.deadFish, isFullCapture]);
    }
    result.list = [];
    return result;
};

//使用技能
NewbieGuide.prototype.useSkill = function (player, skillId, is) {
    //TODO 根据房间配置进行切换武器检测
    this.broadcast(BROADCAST_USE_SKILL, {uid: player.uid, skillId: skillId, isOpen: is}, [player]);
    return true;
};

//切换位置
//NewbieGuide.prototype.changeSite = function (player, toSite) {

//};

//切换武器
NewbieGuide.prototype.changeWeapon = function (player, index) {
    //TODO 根据房间配置进行切换武器检测

    console.log('=== NewbieGuide ===> change weapon, index = ', index);
    var tempWeapon = global.guideInfo.Guide_weaponid || '0';
    tempWeapon = tempWeapon.split("|");
    var isExist = false;
    for(var t =0; t < tempWeapon.length; t++){
        var t_weapon = global.getWeaponData(tempWeapon[t] *1);
        if(t_weapon != undefined && t_weapon.weapon_id *1 == index *1){
            isExist = true; break;
        }
    }
    if(isExist == false){
        return false;
    }
    this.broadcast(BROADCAST_CHANGE_WEAPON, {uid: player.uid, weaponid: index});
    return true;
};

//切换皮肤
NewbieGuide.prototype.changeSkin = function (guid, skinId) {
    this.broadcast(BROADCAST_CHANGE_SKIN, {uid: guid, skinType: skinId});
};

//得到房间数据
NewbieGuide.prototype.getRoomInfo = function(){
    var playerInfo = [];
    var onlineInfo = {
        uid: [],
        cardId: [],
        topEnergy: 0
    };
    var players = this.playerPos[1];
    if(players != undefined) {
        onlineInfo.uid.push(players.uid);
        playerInfo.push(players.getUserInfo());
    }
    /// 鱼路径数据
    var tempScreenInfo = this.fishManager.getOneScreenByTrackId(global.guideInfo.Guide_trackid *1, this.curScreenId);
    var pathInfo = {};
    if(tempScreenInfo != undefined){
        pathInfo = {tracks:[tempScreenInfo]};
    }

    var trackTime = [];
    var deadFish = [];
    for(var key in this.allFishFarmTrackIds){
        var tempTrackIds = this.allFishFarmTrackIds[key];
        for (var i = 0; i < tempTrackIds.length; i++) {
            var obj = {};
            obj.trackId = tempTrackIds[i];
            obj.time = 0;
            trackTime.push(obj);
        }
    }
    //console.log('==Newbie Guide Room===getRoomInfo=>trackTime: ', JSON.stringify(pathInfo) ,JSON.stringify(trackTime));
    return {
        userList: playerInfo,
        onlineInfo: onlineInfo,
        pathinfo: pathInfo,
        tracktime: trackTime,
        deadfishs: deadFish,
        curFishFarmId: 0,
        curTaskFishInfo: [0,0,0,0,0,0,0,0],
        targetTaskFishNum: global.guideInfo.Guide_taskfish_num *1,
        taskFishType: global.guideInfo.Guide_taskfishid *1,
        goldPool: global.guideInfo.Guide_bonus*1,
        explosionQiLin: 0
    };
};

////////////////////////////////////////////
NewbieGuide.prototype.newbieCapture = function (fishes, weapon, isCapture, isFullCapture) {
    // 基础系数
    var basicscoefficient = global.guideInfo.Guide_basics_coefficient*1 || 0;
    var fishManager = this.fishManager;
    var deadFishes = [];
    var resultInfo = {};

    for (var i = 0; i < fishes.length; i++) {
        var fishId = fishes[i];
        if (fishManager.isFishDead(fishId))
            continue;//死了就跳过

        var type = fishManager.getFishTypeById(fishId);
        //根据类型获取鱼的基础配置信息
        var fish = global.getFishInfoByIndex(type);
        if (!fish) {
            logger.debug('no fish data, fish id is ' + fishId + '| type is ' + type);
            continue;
        }

        // 现行方案
        var p = (basicscoefficient / fish.value_low) * 100;
        var r = commons.INRANGE_RANDOM_FLOAT(0,100);

        //// 判断是不是炸弹bomb鱼 *暂时的处理方式*
        if(fish.name == "bomb" && fish.value_type == 1){
            p = 0;
        }
        /// 是否是特殊鱼捕获
        var tempFish = this.explosionFishNum[type];
        if(tempFish != undefined){
            //console.log("====newbieCapture==>: ", isCapture,tempFish,type);
            if(isCapture != undefined && isCapture *1 > 0) {
                tempFish.curNum = tempFish.curNum *1 + 1;   /// 碰撞一次累加1
                //console.log("-----=====>type= %s, tempFish.curNum = %s, total = %s",type, tempFish.curNum, tempFish.total);
                if (tempFish.curNum >= tempFish.total *1) {
                    p = r + 10;  /// 只要p大于r就行
                }
            }else {
                p = r - 10; /// 不到指定情况是打不死特殊鱼
            }
        }

        if(isFullCapture != undefined && isFullCapture > 0){
            p = r + 10;  /// 只要p大于r就行
        }

        if (r > p){ //没捕获
            continue;
        }

        var fishMap = fishManager.fishIdMap;
        var special_type = fishMap[fishId].special_type;
        if(special_type == 0){
            fishManager.setFishIsDead(fishId);
            var dFishData = {fishId:fishId, gold: fish.value_low *1 * weapon.multiple *1};
            deadFishes.push(dFishData);
            continue;
        }
    }
    resultInfo.deadFish = deadFishes;
    return resultInfo;
};
