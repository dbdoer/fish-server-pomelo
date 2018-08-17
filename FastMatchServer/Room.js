/**
 * Created by Author.
 * 结构与普通房间基本相同
 * 整个生命周期由Match管理
 */

module.exports = Room;
//var MatchManager = require('./MatchManager.js');

var Emitter = require('events').EventEmitter;
var util = require("util");
var uuid = require("uuid");
var ThemeScene = require('../common/ThemeScene');
var logger = require("../common/logHelper").helper;

//var EVENT_CREATE = "create";create在外部由RoomManager控制
var EVENT_CLOSE = "close";
var EVENT_ENTER = "enter";
var EVENT_LEAVE = "leave";

var EVENT_STATUS_CHANGE = 'status_change';

//广播类型 玩家动作
var BROADCAST_ENTER = 1;//玩家进入房间
var BROADCAST_FIRE = 2;//开火
var BROADCAST_USE_CARD = 3;//使用卡牌
var BROADCAST_USE_SKILL = 4;//使用技能
var BROADCAST_CAPTURE = 5;//玩家捕获
var BROADCAST_LEAVE = 6;//玩家离开房间
var BROADCAST_SYNC_TRACK_TIME = 7;//定时同步track time
var BROADCAST_SYNC_TRACK_RESET = 8;//重置track
var BROADCAST_START_GAME = 9;
var BROADCAST_TASKFISH_REWARD = 10;
var BROADCAST_FULL = 13;//全服通告
var BROADCAST_QILIN_VALUE = 14//麒麟BOSS价值
var BROADCAST_BOMB_LOCKSCREEN = 15;//捕获炸弹BOSS后锁屏
var BROADCAST_CHANGE_SKIN = 16;//更换皮肤
var BROADCAST_PROPDATA_DROP = 17;//物品掉落
var BROADCAST_THEMESWITCH_READY = 18;//准备切换场景
var BROADCAST_THEMESWITCH_BEGIN = 19;//开始切换场景
var BROADCAST_FISH_TIDE = 20;//鱼潮
var BROADCAST_SPECIAL_FIRE = 21;//特殊武器开火
var BROADCAST_WEAPON_ENERGY = 22;//特殊武器能量
var BROADCAST_ROOM_TALK = 24;
var BROADCAST_GIFT_GIVE = 26;

var BROADCAST_TEST = 10086;
var BIG_BOSS_DIE_ANIMATION_TIME = 18;/// 大BOSS死亡动画时间
var TASK_FISH_ANIMATION_TIME = 20;/// 任务鱼动画时间
var messageid = 0;
var TRACK_UPDATE_BROADCAST_INTERVAL = 15 * 1000;//track更新广播间隔时间

module.exports = Room;
/**
 * @class createRoom 房间 继承了event.EventEmitter
 *
 * 拥有事件
 *      close
 *      enter
 *      leave
 * */
function Room(options) {
    if (!options) {
        throw new Error("argument options can not be null!");
    }

    Emitter.call(this);

    this.guid = uuid.v4();
    this.roomId = options.roomId;//房间唯一识别id
    this.size = options.size > 8 ? 8 : options.size;//创建的房间大小(最多多少人) 此项可以为空
    this.status = -1;//房间状态 -1 不可用 0可以进入 1 条件进入(密码) 2不可进入(满员)
    //this.fishFarmIndex = options.farmIndex || 0;//房间类型 配置表index

    this.pwd = options.pwd;

    this.matchTypeId = options.matchTypeId;
    this.switchSceneStatus = 0; /// 0:准备切换场景 1:已经切换好场景 2:等待鱼潮
    this.fishTideState = false;
    this.farmIndexList = global.getRandomFarmIdByLastFarmId(this.matchTypeId, null);
    this.curFishFarmIndex = 0;  ///从下标0的开始
    this.sceneSwitchByIndex(this.curFishFarmIndex);
    this.playerPos = [];//玩家位置表 元素对应玩家 index表示位置 0 ~ size-1
    this.playerCount = 0;//玩家数量
    this.stopFlag = false;
    this.startFlag = false;
    this.bombLockScreenTime = 0; ///炸弹Boss被捕获后,锁屏时间
    this.qieLockScreenTime = 0; ///企鹅被捕获后,锁屏时间
    this.explosionQiLin = 0; ///用于记录麒麟鱼的击中次数
    this.isFistUpdateTrackTime = true; ///是否是鱼潮结束后第一次同步时间
    this.init();
}

util.inherits(Room, Emitter);

Room.prototype.init = function () {
    this.lastUpdateTime = 0;

    //this.scene = require('./Scene')(this.fishFarmIndex);
    for (var i = 0; i < this.size; i++) {
        this.playerPos[i] = null; //空位置是-1  初始化
    }

    this.time = 0;// room已经存在的时间
    if (this.pwd !== undefined || this.pwd !== null) {
        this.changeStatus(1);
    } else {
        this.changeStatus(0);
    }
};

/// 切换场景时调用()
Room.prototype.sceneSwitchByIndex = function (index) {
    if (index == undefined) {
        return;
    }
    if (index * 1 > this.farmIndexList.length - 1) {
        index = 0;
        this.curFishFarmIndex = index;
        this.farmIndexList = global.getRandomFarmIdByLastFarmId(this.matchTypeId, this.fishFarmId);
    }

    this.fishFarmId = this.farmIndexList[index];
    logger.debug('==FastMatch==sceneSwitchByIndex==>curFishFarmId: ' + this.fishFarmId + ", ", this.fishTideTrackId);
    if (this.fishFarmId == undefined || this.fishFarmId < 0) {
        this.fishFarmId = 0;
    }
    if (this.scene != undefined) {
        this.weaponEnergyInfo[0] = this.scene.weaponFishEnergy * 1;
        this.scene = {};
    }

    this.scene = ThemeScene(this.fishFarmId, this.matchTypeId, this.fishTideTrackId, this.weaponEnergyInfo);
    this.fishTideTrackId = this.scene.curFishTideTrackId || 0;
    this.weaponEnergyInfo = []; /// 下标0为当前能量值,下标1为总的能量值
};
Room.prototype.setMatchInfo = function (matchInfo) {
    ///matchInfo = {timeCounter,current}
    this.match = matchInfo;
};

//房间内广播 根据type分配pid pName
Room.prototype.broadcast = function (type, data, except) {

    if (!except) except = []; //除外规则 不广播谁
    var pid = -1;
    var pName;

    switch (type) {

        case BROADCAST_ENTER:
            pid = 4203;
            pName = 'SC_BroadcastEnterRoom';
            break;

        case BROADCAST_FIRE:
            pid = 4208;
            pName = "SC_BroadcastFire";
            break;

        case BROADCAST_USE_CARD:
            break;

        case BROADCAST_USE_SKILL:
            pid = 4602;
            pName = 'SC_BroadcastUseSkill';
            break;

        //皮肤更换
        case BROADCAST_CHANGE_SKIN: 
            pid = 4229;
            pName = 'SC_BroadcastSkinChange';
            break;

        case BROADCAST_CAPTURE:
            pid = 4210;
            pName = null;
            break;

        case BROADCAST_LEAVE:
            pid = 4206;
            pName = 'SC_BroadcastLeaveRoom';
            break;

        case BROADCAST_SYNC_TRACK_TIME:
            pid = 4212;
            pName = 'SC_SynchTrackTime';
            break;

        case BROADCAST_SYNC_TRACK_RESET:
            pid = 4211;
            pName = 'Pathinfo';
            break;

        case BROADCAST_ROOM_TALK:
            pid = 4233;
            pName = 'SC_BroadcastExpressionInfo';
            break;

        case BROADCAST_GIFT_GIVE:
            pid = 4237;
            pName = 'SC_BroadcastGiftGive';
            break;

        case BROADCAST_START_GAME:
            pid = 4266;
            pName = 'SC_BroadcastFastMatchStart';
            break;

        case BROADCAST_TEST:
            pid = 4240;
            pName = 'SC_SynchData';
            data = { questIndex: 12 };
            break;

        case BROADCAST_TASKFISH_REWARD: 
            pid = 4270;
            pName = 'SC_BroadcastClassicRstInfo';///经典模式中彩金结果统计
            break;

        case BROADCAST_QILIN_VALUE: 
            pid = 4310;
            pName = 'SC_BroadcastQiLinValue';///麒麟Boss价值
            break;

        case BROADCAST_BOMB_LOCKSCREEN: 
            pid = 4311
            pName = 'SC_BroadcastBombLockScreen';///炸弹Boss锁屏
            break;

        case BROADCAST_FULL: 
            pid = 4809;
            pName = 'SC_FullServiceNoticeData';///全服通告
            break;

        case BROADCAST_PROPDATA_DROP:
            pid = 4226;
            pName = 'SC_BroadcastDropData';///广播物品掉落
            break;

        case BROADCAST_THEMESWITCH_READY: 
            pid = 4302;
            pName = 'SC_ThemeSwitchReady';///准备切换场景
            break;

        case BROADCAST_THEMESWITCH_BEGIN: 
            pid = 4303;
            pName = 'SC_ThemeSwitchBegin';///开始切换场景
            break;

        case BROADCAST_FISH_TIDE: 
            pid = 4213;
            pName = 'SC_FishWaveBegin';///鱼潮
            break;

        case BROADCAST_WEAPON_ENERGY: 
            pid = 4234;
            pName = 'SC_SpecialWeapon_Energy';///特殊武器能量
            break;

        case BROADCAST_SPECIAL_FIRE: 
            pid = 4236;
            pName = 'SC_BroadcastSpecialWeapon_Fire';///特殊开火广播
            break;

        default:
            break;
    }

    if (pid < 0) {
        return;
    }
    
    for (var k in this.playerPos) {
        var p = this.playerPos[k];
        if (p != undefined && p != null && except.indexOf(p) == -1) {
            p.sendMsg(pid, pName, data);
        }
    }
};

/**
 * 释放这个room之前调用
 * @return {boolean} 是否可以释放这个room
 * */
Room.prototype.close = function () {
    if (this.playerCount > 0)
        return false;

    this.emit(EVENT_CLOSE, this.roomId);
    return true;
};

/**
 * 生成当前房间信息
 *
 * 生成trackTime
 * 生成path
 * 生成玩家信息
 * 生成房间信息
 * */
Room.prototype.buildRoomInfo = function () {
};

Room.prototype.getPlyersInfo = function () {
    var ret = [];
    for (var k = 0; k < this.playerPos.length; k++) {
        var p = this.playerPos[k];
        if (!p) {
            continue;
        }
        ret.push(p.getUserInfo())
    }
    return ret;
}

//由一个server实例统一的定时器进行调用 Match.js 140行调用
Room.prototype.update = function () {
    if (this.bombLockScreenTime == 0 && this.qieLockScreenTime == 0) {
        this.time++;
        var now = Date.now();
        if (this.fishTideState == false) {
            /// 准备切换场景
            if (this.time >= this.scene.fishFarmConfig.Scensetime * 1 - 6 && this.switchSceneStatus == 0) {
                this.broadcast(BROADCAST_THEMESWITCH_READY, { isStart: true });
                this.switchSceneStatus = 1;
            }
            if (this.time >= this.scene.fishFarmConfig.Scensetime * 1 && this.switchSceneStatus == 1) {
                this.curFishFarmIndex += 1;
                this.sceneSwitchByIndex(this.curFishFarmIndex);
                this.broadcast(BROADCAST_THEMESWITCH_BEGIN, { nextSceneIndex: this.fishFarmId });
                this.switchSceneStatus = 2;
            }
            if (this.time >= this.scene.fishFarmConfig.Scensetime * 1 + 6 && this.switchSceneStatus == 2) {
                //this.fishTideState = true;  ///鱼潮状态
                this.time = 0;  ///场景存活时间(包括鱼潮存活时间)
                this.switchSceneStatus = 0;
                this.isFistUpdateTrackTime = true; ///是否是鱼潮结束后第一次同步时间
                var pathInfo = this.scene.fishManager.getRandomPathInfos();
                var trackTime = this.scene.getTrackTimeInfo();
                /// 特殊需求--不出鱼潮
                for (var t = 0; t < trackTime.length; t++) {
                    if (trackTime[t].trackId * 1 >= 470 && trackTime[t].trackId * 1 <= 475) {
                        trackTime[t].time = -1;
                    }
                }
                var deadfishs = this.scene.getTrackDeadFishInfo();
                this.broadcast(BROADCAST_FISH_TIDE, { pathinfo: pathInfo, tracktime: trackTime, deadfishs: deadfishs });
            } else {
                if (this.switchSceneStatus != 2) {
                    var path = this.scene.refreshTrackByTime();
                    if (path != undefined && path.length > 0) {
                        //console.log('==4211=Update=BROADCAST_SYNC_TRACK_RESET==> ',JSON.stringify(path));
                        // 广播path重置
                        this.broadcast(BROADCAST_SYNC_TRACK_RESET, { tracks: path });
                    } else {
                        if (now - this.lastUpdateTime > TRACK_UPDATE_BROADCAST_INTERVAL) {
                            // 广播trackTime
                            //console.log('===> BROADCAST_SYNC_TRACK_TIME <== 4212');
                            var tempTracktime = this.scene.getCurrentTrackTime(this.isFistUpdateTrackTime);
                            this.broadcast(BROADCAST_SYNC_TRACK_TIME, { tracktime: tempTracktime });
                            this.lastUpdateTime = now;
                            this.isFistUpdateTrackTime = false;
                        }
                    }
                }
            }
        }/*else{
            if(this.scene.refreshTrackByTimeByFishType(global.fishTrackType.FishTide) == true){
                console.log('==22222=====> fishTideState = false');
                this.fishTideState = false;  /// 鱼潮结束
                this.isFistUpdateTrackTime = true; ///是否是鱼潮结束后第一次同步时间
            }
        }*/
    }
    else {
        if (this.qieLockScreenTime > 0) {
            this.qieLockScreenTime++;
            if (this.qieLockScreenTime >= 10) {
                this.qieLockScreenTime = 0;
                this.broadcast(BROADCAST_BOMB_LOCKSCREEN, { isLockScreen: this.qieLockScreenTime });
            }
        }
        if (this.bombLockScreenTime > 0) {
            this.bombLockScreenTime++;
            if (this.bombLockScreenTime >= 10) {
                this.bombLockScreenTime = 0;
                this.broadcast(BROADCAST_BOMB_LOCKSCREEN, { isLockScreen: this.bombLockScreenTime });
            }
        }
    }

};

/**
 * 切换房间状态
 * 根据不同状态房间内执行不同的逻辑
 * 触发状态改变事件
 * @param status{int}状态码
 *          -1 不可用状态
 *          0 可用
 *          1 条件进入(密码)
 *          2 不可进入(满员)
 * @return{void}
 * */
Room.prototype.changeStatus = function (status) {
    this.status = status;
    this.emit(EVENT_STATUS_CHANGE, status);
};

//=======================供player调用========================

/**
 * 房间是否已满
 * @return {boolean}房间状态
 * */
Room.prototype.isFull = function () {
    return this.status == 2;
};

/**
 * 进入房间
 * @param player{Player} 进入房间的玩家
 * @return{Number}返回记过以int表示
 * */
Room.prototype.join = function (player) {
    if (this.playerCount == this.size) {
        this.changeStatus(2);//房间满员
    }
    if (player == undefined || player == null) {
        return;
    }
    for (var i = 0; i < this.playerPos.length; i++) {
        if (!this.playerPos[i]) {
            this.playerPos[i] = player;
            break;
        }
    }

    this.playerCount++;
    if (this.playerCount == this.size) {
        this.changeStatus(2);//房间满员
    }

    player.pos = this.playerPos.indexOf(player);
    this.broadcast(BROADCAST_ENTER, {
        userInfo: player.getUserInfo(),
        tracktime: []
    }); // 向房间内所有玩家进行广播
    this.emit(EVENT_ENTER, player.uid);
    /*var players = [];
    for (var k in this.playerPos) {
        var p = this.playerPos[k];
        if (p) {
            players.push(p.getUserInfo());
        }
    }



    return players;*/
};

Room.prototype.getNotRobot = function () {
    var players = [];
    for (var k in this.playerPos) {
        var p = this.playerPos[k];
        if (p && p !== -1) {
            if (!p.isRobot()) {
                players.push(p);
            }
        }
    }
    return players;
}
Room.prototype.getRobot = function () {
    var players = [];
    for (var k in this.playerPos) {
        var p = this.playerPos[k];
        if (p) {
            if (p.isRobot()) {
                players.push(p);
            }
        }
    }
    return players;
}

/**
 * 开始游戏 初始化路径等信息并广播  Match.js 115行调用
 * */
Room.prototype.start = function () {
    this.scene.init(this.matchTypeId);//初始化场景
    this.startTime = Date.now();//房间开始时间
    this.startFlag = true;

    logger.debug('==Room start==>startFlag : ' + this.startFlag);
    this.broadcast(BROADCAST_START_GAME, this.getRoomInfo());
};

/**
 * 停止游戏 禁用所有消息进入 等待结算后
 * */
Room.prototype.stop = function () {
    this.stopFlag = true;

};

/* *
 * 获取房间信息
 * 房间内的player信息
 * 房间当前track信息
 * 房间内当前死鱼信息
 * 房间内路径信息
 * 房间本身信息
 * */
Room.prototype.getRoomInfo = function () {
    var scene = this.scene;
    if (!scene || !scene.allFishFarmTrackIds) {
        return null;
    }

    var pathInfo = scene.fishManager.getRandomPathInfos();
    var trackTime = scene.getTrackTimeInfo();
    // 特殊需求--不出鱼潮
    for (var t = 0; t < trackTime.length; t++) {
        if (trackTime[t].trackId * 1 >= 470 && trackTime[t].trackId * 1 <= 475) {
            trackTime[t].time = -1;
        }
    }
    var deadFish = [];

    for (var i = 0; i < scene.allFishFarmTrackIds.length; i++) {
        var trackFish = {};
        trackFish.trackId = scene.allFishFarmTrackIds[i];
        trackFish.fishIds = scene.fishManager.getDeadFishListByTrackId(trackFish.trackId);
        deadFish.push(trackFish);
    }

    return {
        time: this.match.timeCounter - this.time,
        pathinfo: pathInfo,
        tracktime: trackTime,
        deadfishs: deadFish,
        explosionQiLin: this.explosionQiLin
    };
};

//离开房间
Room.prototype.leaveRoom = function (player) {
    if (!player) {
        return;
    }

    var pos = this.playerPos.indexOf(player);
    this.playerPos[pos] = null;
    this.playerCount--;

    this.emit(EVENT_LEAVE, player.uid);
    if (this.status == 2 && this.playerCount == 0) {
        if (this.pwd !== undefined)
            this.changeStatus(1);
        else
            this.changeStatus(0);
    }

    //没人房间关闭
    //var arr = this.getNotRobot();
    if (this.playerCount == 0) {
        this.close();
    }

    this.broadcast(BROADCAST_LEAVE, { uid: player.uid });
};

///比赛进行中退出房间时,捕获到道具鱼(钻头炮)后的处理
Room.prototype.setSpceialWeaponFish = function (playerUid) {
    this.scene.weaponFishEnergy = 0;
    this.broadcast(BROADCAST_LEAVE, { uid: playerUid, matchType: this.matchTypeId });
    this.scene.setSpceialWeaponTrackTime(false);
};

//开火
Room.prototype.fire = function (player, x, y) {
    this.broadcast(BROADCAST_FIRE, [player.getPos(), x, y], [player]);
};

//特殊武器开火
Room.prototype.specialFire = function (player, x, y, weaponType) {
    this.broadcast(BROADCAST_SPECIAL_FIRE, { playerIndex: player.getPos(), weaponType: weaponType, fireX: x, fireY: y }, [player]);
};
/**
 * 碰撞 room负责广播结果 具体计算在scene中进行
 * @return{object}掉落列表
 * */
Room.prototype.explosion = function (player, multiple, fishes, isFullCapture, bombValue, finalExplode) {
    if (!this.canFire()) {
        return 0;
    }
    var boxPropRate = 0;
    /// vip等级大于等于7级后,每相差1级掉落系数累加 box_rate (0.1000)
    if (player.vipLv * 1 >= 7) {
        boxPropRate = (1 + player.vipLv - 7) * global.other[1].box_rate * 1;
    }
    var result = this.scene.capture(2, fishes, multiple, isFullCapture, this.explosionQiLin, bombValue, boxPropRate, 0, finalExplode);
    // 获取到结果后进行广播 并返回player需要的结果(划掉)
    //返回将死鱼进行广播 并返回计算信息给player
    if (result.explosionQiLin != undefined) {
        this.explosionQiLin = result.explosionQiLin;
    }

    var awardScore = 0;
    if (result.deadFish.length > 0) {

        /// 记录任务鱼的条数
        for (var i = 0; i < result.deadFish.length; i++) {
            //根据类型获取鱼的基础配置信息
            var fishType = this.scene.fishManager.getFishTypeById(result.deadFish[i].fishId);
            if (fishType * 1 == global.capture[this.matchTypeId].task_fish_id * 1) {
                player.curTaskFishNum += 1;
                //// 满足条数后发放奖励 100积分
                if (player.curTaskFishNum >= global.capture[this.matchTypeId].task_fish_num * 1) {
                    awardScore = global.compConfig[this.matchTypeId].bonus * 1;
                    player.curTaskFishNum = 0;  ///任务鱼条数清零
                    this.broadcast(BROADCAST_TASKFISH_REWARD, {
                        matchType: 11,
                        reward: awardScore,
                        position: player.pos + 1
                    });
                    /// 任务鱼完成时,如果主题剩余时间小于动画时间
                    if (this.scene.fishFarmConfig.Scensetime - this.time < TASK_FISH_ANIMATION_TIME) {
                        this.time -= TASK_FISH_ANIMATION_TIME - (this.scene.fishFarmConfig.Scensetime - this.time);
                    }
                }
            }

            var fishInfo = global.getFishInfoByIndex(fishType);
            if (fishInfo == undefined) {
                continue;
            }
            ///  大Boss死亡后,如果主题剩余时间小于鱼的死亡动画时间
            if (fishInfo.fish_type == 3) {
                if (this.scene.fishFarmConfig.Scensetime - this.time < BIG_BOSS_DIE_ANIMATION_TIME) {
                    this.time -= BIG_BOSS_DIE_ANIMATION_TIME - (this.scene.fishFarmConfig.Scensetime - this.time);
                }
            }

            if (fishInfo.name == "qilin") {
                this.explosionQiLin = 0;  ///捕获成功则清零
            }
            else if (fishInfo.name == "bomb") {
                this.bombLockScreenTime = 1;
                this.broadcast(BROADCAST_BOMB_LOCKSCREEN, { isLockScreen: this.bombLockScreenTime });
            }
            else if (fishInfo.name == "xiaocaishen") {
                var newCount = Number(this.scene.trackCount[global.fishTrackType.SmallBoss][this.scene.curSmallBossIndex]) * 1.5;
                this.scene.trackCount[global.fishTrackType.SmallBoss][this.scene.curSmallBossIndex] = Math.floor(newCount);
                var newTrackTime = Number(this.scene.trackTime[global.fishTrackType.SmallBoss][this.scene.curSmallBossIndex]) * 1.5;
                this.scene.trackTime[global.fishTrackType.SmallBoss][this.scene.curSmallBossIndex] = Math.floor(newTrackTime);
                var index = this.scene.curSmallBossIndex;
                /*if(index > 0){
                    index = index -1;
                }*/
                this.scene.allFishFarmTrackIds[global.fishTrackType.SmallBoss][index] = "440";

                this.broadcast(BROADCAST_SYNC_TRACK_TIME, { tracktime: this.scene.getCurrentTrackTime() });
            }
            else if (fishInfo.name == "dacaishen") {
                var index = this.scene.curSmallBossIndex;
                /*if(index > 0){
                    index = index -1;
                }*/
                this.scene.allFishFarmTrackIds[global.fishTrackType.SmallBoss][index] = "430";
            }
            else if (fishInfo.name == "qie") {
                this.qieLockScreenTime = 1;
                this.broadcast(BROADCAST_BOMB_LOCKSCREEN, { isLockScreen: this.qieLockScreenTime });
            }

            if (fishInfo.fish_type == 4) { ///是否捕获了特殊武器鱼
                player.captureWeaponFish.fishType = fishType * 1; /// 鱼的索引
                player.captureWeaponFish.weaponInfo = multiple; /// 当前武器信息
                this.scene.setSpceialWeaponTrackTime(true);
                this.weaponEnergyInfo = [this.scene.weaponFishEnergy, this.scene.totalWeaponEnergy];
            }
        }

        //广播捕获到的鱼
        this.broadcast(BROADCAST_CAPTURE, [player.getPos(), result.deadFish, isFullCapture]);
    }
    else {
        for (var i = 0; i < fishes.length; i++) {
            var fishType = this.scene.fishManager.getFishTypeById(fishes[i]);
            var fishInfo = global.getFishInfoByIndex(fishType);
            if (fishInfo == undefined) {
                continue;
            }
            if (fishInfo.name == "qilin") {
                this.broadcast(BROADCAST_QILIN_VALUE, { qiLinValue: this.explosionQiLin });
            }
        }
    }
    if (result.drop != undefined) {
        for (var dKey in result.drop) {
            var tempDropList = [];
            var tempGemNum = 0;
            if (result.drop[dKey] != undefined && result.drop[dKey].propList != undefined) {
                var list = result.drop[dKey].propList;
                for (var l = 0; l < list.length; l++) {
                    if (list[l] != undefined) {
                        tempDropList.push({ propID: list[l].id, propType: list[l].type, propNum: list[l].num })
                    }
                }
            }
            if (result.drop[dKey] != undefined && result.drop[dKey].gemNum != undefined) {
                tempGemNum = result.drop[dKey].gemNum * 1;
            }

            if (tempDropList.length > 0 || tempGemNum > 0) {
                this.broadcast(BROADCAST_PROPDATA_DROP, { playerIndex: player.getPos(), fishId: dKey, dataPropList: tempDropList, gemNum: tempGemNum });
            }
        }
    }
    if (finalExplode != undefined) {
        var tempWeaponEnergy = 0;
        if (this.scene.weaponFishEnergy > 0 && finalExplode == 0) {
            tempWeaponEnergy = this.scene.weaponFishEnergy;
        } else {
            this.scene.setSpceialWeaponTrackTime(false);
        }

        this.broadcast(BROADCAST_WEAPON_ENERGY, { curWeaponEnergy: tempWeaponEnergy });
    }

    return { worth: result.score, task: awardScore, list: result.drop/*result.deadFish*/ };
};

//使用卡牌
Room.prototype.useCard = function (player) {
};

//使用技能
Room.prototype.useSkill = function (player, skillId, is, skillCoefficient) {

    //TODO 根据房间配置进行切换武器检测
    this.scene.setSkillCoefficient(skillCoefficient);
    logger.debug('==FastMatchRoom===>use skill: ' + skillCoefficient);
    this.broadcast(BROADCAST_USE_SKILL, { uid: player.uid, skillId: skillId, isOpen: is }, [player]);
    return true;
};
Room.prototype.changeSkin = function (guid, skinId) {
    this.broadcast(BROADCAST_CHANGE_SKIN, { uid: guid, skinType: skinId });
};

//聊天
Room.prototype.chat = function (player) {
};
//预定义表情文字
Room.prototype.expression = function (player, messageId, messageContent, cb) {
    this.broadcast(BROADCAST_ROOM_TALK, {
        name: player.name,
        pos: player.pos
        , messageId: messageId, messageContent: messageContent
    });
    cb(null);
};

//赠送礼物
Room.prototype.giftGive = function (player, id, uid, fid, cb) {
    this.broadcast(BROADCAST_GIFT_GIVE, {
        id: id,
        uid: uid,
        giftId: fid
    });
    cb(null);
};

//是否可以开火
Room.prototype.canFire = function () {
    var flag = false;
    if (this.startFlag) flag = true;
    if (this.stopFlag) flag = false;
    return flag;
};

//==============player调用结束===========================
