"use strict";
/**
 * Created by ck01-441 on 2016/3/7.
 * createRoom  容器 带有基本属性与最多4个player
 */

var roomManager;

var Emitter = require('events').EventEmitter;
var util = require("util");
var commons = require('../common/commons');
var logger = require("../common/logHelper").helper;
var ThemeScene = require('../common/ThemeScene');
var countUserRoomDao = require("../dao/countUserRoomDao");
var Other = require('../Resources/other.json')["1"];
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
var BROADCAST_CHANGE_SITE = 9; //换座位
var BROADCAST_CHANGE_WEAPON = 10;//切换武器
var BROADCAST_GOLD_POOL = 11;//奖金池
var BROADCAST_TASKFISH_REWARD = 12;//任务鱼奖励
var BROADCAST_FULL = 13;//全服通告
var BROADCAST_ACCEPT_GOLD = 14;//领取金币
var BROADCAST_QILIN_VALUE = 15;//麒麟鱼的价值
var BROADCAST_BOMB_LOCKSCREEN = 16;//捕获炸弹BOSS后锁屏
var BROADCAST_CHANGE_SKIN = 17;//皮肤更换
var BROADCAST_THEMESWITCH_READY = 18;//准备切换场景
var BROADCAST_THEMESWITCH_BEGIN = 19;//开始切换场景
var BROADCAST_PROPDATA_DROP = 20;//物品掉落
var BROADCAST_FISH_TIDE = 21;//鱼潮
var BROADCAST_UP_GRADE = 22;//升级
var BROADCAST_SPECIAL_FIRE = 23;//特殊武器开火
var BROADCAST_ROOM_TALK = 24;
var BROADCAST_WEAPON_ENERGY = 25;//特殊武器能量
var BROADCAST_GIFT_GIVE = 26;

var BROADCAST_TEST = 10086;
var BIG_BOSS_DIE_ANIMATION_TIME = 18;/// 大BOSS死亡动画时间
var TASK_FISH_ANIMATION_TIME = 20;/// 任务鱼动画时间

var TRACK_UPDATE_BROADCAST_INTERVAL = 15000;//track更新广播间隔时间

var FORCE_OFFLINE_RPCID = 1;  ///对应../FrontServer/rpcModule/rpcID.js文件内的填写的
var messageid = 0;

//sceneManager, this, options
module.exports = function (_roomManager, options) {
    roomManager = _roomManager;
    return new ThemeRoom(options);
};

/**
 * @class createRoom 房间 继承了event.EventEmitter
 *
 * 拥有事件
 *      close
 *      enter
 *      leave
 * */
function ThemeRoom(options) {
    if (!options) {
        throw new Error("argument options can not be null!");
    }
    Emitter.call(this);
    this.roomId = options.roomId;//房间唯一识别id
    this.size = 4; /// 目前是定死房间最大人数8个
    this.status = -1;//房间状态 -1 不可用 0可以进入 1 条件进入(密码) 2不可进入(满员)
    //console.log('create room options = ' + JSON.stringify(options));
    this.typeId = options.type || 0;

    this.fishTideState = true;
    this.switchSceneStatus = 0; /// 0:准备切换场景 1:已经切换好场景 2:等待鱼潮
    this.farmIndexList = global.getRandomFarmIdByLastFarmId(this.typeId, null);
    this.curFishFarmIndex = 0;  ///从下标0的开始
    this.sceneSwitchByIndex(this.curFishFarmIndex);
    this.pwd = options.pwd;

    this.playerPos = [];//玩家位置表 元素对应玩家 index表示位置 0 ~ size-1
    this.playerCount = 0;//玩家数量

    this.goldPool = global.capture[this.typeId].bonus_base *1 || 0;
    this.explosionQiLin = 0; ///用于记录麒麟鱼的击中次数
    this.taskFishIdOfPos = {};  /// 房间座位对应的任务鱼数以及捕获时的武器倍数{fishNum, weaponMultiple}
    this.init();
    this.timeoutSwitch = true; /// 用于发彩金奖励时限制定时更新奖金池
    this.bombLockScreenTime = 0; ///炸弹被捕获后,锁屏时间
    this.qieLockScreenTime = 0; ///企鹅被捕获后,锁屏时间
    this.isFistUpdateTrackTime = true; ///是否是鱼潮结束后第一次同步时间

    this.paramPosCapture = [0,0,0,0,0,0,0,0];//位置捕获率参数
    this.lucklyPosCapture = [0,1,2,3,4,5,6,7];//幸运参数
    this.lucklyPosCapture.sort(function(){ return 0.5 - Math.random()});
    this.gmCoefficient = {};
    this.kickListOnTimeOut = [];        //超时踢掉的人
    this.life_time = 0; //房间存活时间
}

util.inherits(ThemeRoom, Emitter);

/// 切换场景时调用()
ThemeRoom.prototype.sceneSwitchByIndex = function(index){
    if(index == undefined){
        return;
    }
    if(index *1> this.farmIndexList.length -1)
    {
        index = 0;
        this.curFishFarmIndex = index;
        this.farmIndexList = global.getRandomFarmIdByLastFarmId(this.typeId, this.fishFarmId);
    }
    this.fishFarmId = this.farmIndexList[index];
    logger.debug('==NormalMatch==sceneSwitchByIndex==>curFishFarmId: '+ this.fishFarmId+ ", "+ this.fishTideTrackId);
    if(this.fishFarmId == undefined || this.fishFarmId < 0){
        this.fishFarmId = 0;
    }
    if(this.themeScene != undefined){
        this.weaponEnergyInfo[0] = this.themeScene.weaponFishEnergy *1;
        this.themeScene = {};
    }
    this.themeScene = ThemeScene(this.fishFarmId, this.typeId, this.fishTideTrackId, this.weaponEnergyInfo);
    this.fishTideTrackId = this.themeScene.curFishTideTrackId || 0;
    this.weaponEnergyInfo = []; /// 下标0为当前能量值,下标1为总的能量值
};

ThemeRoom.prototype.init = function () {
    this.lastUpdateTime = 0;
    for (var i = 0; i < this.size; i++) {
        this.playerPos[i] = -1; //空位置是-1  初始化
    }
    /*for (var i = 0; i < 8; i++) {
        if(i % 2 == 0){
            this.playerPos[i] = -1; //空位置是-1  初始化
        }
    }*/

    this.time = 0;// room已经存在的时间
    this.startTime = Date.now();//房间开始时间
    this.randArr11 = [];  //位置系数数组
    this.refreshtime = commons.INRANGE_RANDOM(global.capture[this.typeId].refreshLowerLimit,global.capture[this.typeId].refreshUpperLimit);
    this.weaponMax = 0;
    this.fireValuePool = 0;
    this.retgold = 0;
    this.currentProfit = 0;   //房间当前盈利值
    this.roomcoefficient = 0;  //房间系数
    this.currentProfitE1 = 0;  //第一次抽放水过后的盈利值
    this.currentProfitE2 = 0;  //第二轮放抽水过后的盈利值
    this.currentProfitC1 = -10000000000; //达到盈利阈值是房间最高盈利值
    this.currentProfitC2 = 10000000000;  //达到亏损阈值是房间最高亏损值
    this.currentProfitEP = 0;  //最终总的盈利值
    this.state = 0;//房间状态，初始为正常状态


    if (this.pwd) {
        this.status = 1;
    } else {
        this.status = 0;
    }

    /*var list = [1112001,1112002,1112003,1112004];
    for(var i = 0;i< list.length;i++){
        if(ret[list[i]] == null){
            this.gmcoefficient[list[i]] = 0;
        } else {
            this.gmcoefficient = ret[list[i]];
        }
    }*/
};

ThemeRoom.prototype.againInit = function (info){
    if( info == undefined){
        return -1;
    }
    this.goldPool = info.goldPool;
    this.taskFishIdOfPos = info.taskFishIdOfPos; ///{fishNum, weaponMultiple}

    return 0;
}
//房间内广播 根据type分配pid pName
ThemeRoom.prototype.broadcast = function (type, data, except) {
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
            case BROADCAST_ENTER:
                pid = 4203;
                pName = 'SC_BroadcastEnterRoom';
                break;
            case BROADCAST_FIRE:
                pid = 4208;
                pName = null;
                break;
            case BROADCAST_USE_CARD:

                break;
            case BROADCAST_USE_SKILL:
                pid = 4602;
                pName = 'SC_BroadcastUseSkill';
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
            case BROADCAST_CHANGE_SITE:
                pid = 4263;
                pName = 'SC_BroadcastChangeSite';
                break;
            case BROADCAST_CHANGE_WEAPON:
                pid = 4231;
                pName = 'SC_BroadcastChangeWeapon';
                break;
            case BROADCAST_TEST:
                pid = 4240;
                pName = 'SC_SynchData';
                data = {questIndex: 12};
                break;
            case BROADCAST_GOLD_POOL:{
                pid = 4224;
                pName = 'SC_UploadData';
            }break;
            case BROADCAST_TASKFISH_REWARD:{
                pid = 4270;
                pName = 'SC_BroadcastClassicRstInfo';///经典模式中彩金结果统计
            }break;
            case BROADCAST_FULL:{
                pid = 4809;
                pName = 'SC_FullServiceNoticeData';///全服通告
            }break;
            case BROADCAST_ACCEPT_GOLD:{
                pid = 4232;
                pName = 'SC_BroadcastCurrencyUnit';//广播金币同步
            }break;
            case BROADCAST_QILIN_VALUE:{
                pid = 4310;
                pName = 'SC_BroadcastQiLinValue';///麒麟Boss价值
            }break;
            case BROADCAST_BOMB_LOCKSCREEN:{
                pid = 4311;
                pName = 'SC_BroadcastBombLockScreen';///炸弹Boss锁屏
            }break;
            case BROADCAST_CHANGE_SKIN:{
                 pid = 4229;
                 pName = 'SC_BroadcastSkinChange';///皮肤更换
             }break;
            case BROADCAST_THEMESWITCH_READY:{
                pid = 4302;
                pName = 'SC_ThemeSwitchReady';///准备切换场景
            }break;
            case BROADCAST_THEMESWITCH_BEGIN:{
                pid = 4303;
                pName = 'SC_ThemeSwitchBegin';///开始切换场景
            }break;
            case BROADCAST_PROPDATA_DROP:{
                pid = 4226;
                pName = 'SC_BroadcastDropData';///广播物品掉落
            }break;
            case BROADCAST_FISH_TIDE:{
                pid = 4213;
                pName = 'SC_FishWaveBegin';///鱼潮
            }break;
            case BROADCAST_UP_GRADE:{
                pid = 4120;
                pName = 'SC_BroadcastLevelUp';///广播升级
            }break;
            case BROADCAST_WEAPON_ENERGY:{
                pid = 4234;
                pName = 'SC_SpecialWeapon_Energy';///特殊武器能量
            }break;
            case BROADCAST_SPECIAL_FIRE:{
                pid = 4236;
                pName = 'SC_BroadcastSpecialWeapon_Fire';///特殊开火广播
            }break;
            default:
                break;
        }
    }
    if (pid < 0)return;
    for (var k in this.playerPos) {
        if (this.playerPos[k] != -1 && except.indexOf(this.playerPos[k]) == -1) {
            this.playerPos[k].sendMsg(pid, pName, data);
        }
    }
};

/**
 * 释放这个room之前调用
 * @return {boolean} 是否可以释放这个room
 * */
ThemeRoom.prototype.close = function () {
    if (this.playerCount > 0)
        return false;
    this.emit(EVENT_CLOSE, this.roomId);
    return true;
};


//由一个server实例统一的定时器进行调用
ThemeRoom.prototype.update = function () {    //进行路径的刷新以及路径时间的更新
    this.life_time ++;
    this.kickUserOverTime();
    this.getCoefficientByPosition();
    var now = Date.now();
    if(this.bombLockScreenTime == 0 && this.qieLockScreenTime == 0) {  //不锁屏情况下
        this.time ++;
        //console.log('-----------------this.fishTideState ', this.fishTideState);
        if(this.fishTideState == false){
                /// 准备切换场景
            if(this.time >= this.themeScene.fishFarmConfig.Scensetime *1 - 6 && this.switchSceneStatus == 0){
                this.broadcast(BROADCAST_THEMESWITCH_READY, {isStart: true});
                this.switchSceneStatus = 1;
            }
            if(this.time >= this.themeScene.fishFarmConfig.Scensetime *1 && this.switchSceneStatus == 1){
                this.curFishFarmIndex += 1;
                this.sceneSwitchByIndex(this.curFishFarmIndex);
                this.broadcast(BROADCAST_THEMESWITCH_BEGIN, {nextSceneIndex: this.fishFarmId});
                this.switchSceneStatus = 2;
            }
            if(this.time >= this.themeScene.fishFarmConfig.Scensetime *1 +6 && this.switchSceneStatus == 2){
                this.fishTideState = true;  ///鱼潮状态
                this.time = 0;  ///场景存活时间(包括鱼潮存活时间)
                this.switchSceneStatus = 0;
                this.isFistUpdateTrackTime = true; ///是否是鱼潮结束后第一次同步时间
                var pathInfo = this.themeScene.fishManager.getRandomPathInfos();  //{trackid:tempTrack.trackid, screens: [{ screenid: '3', waves: [ { deep: 896 }, { deep: 960 } ] }]}
                var trackTime = this.themeScene.getTrackTimeInfo(this.fishTideState);
                var deadfishs = this.themeScene.getTrackDeadFishInfo();
                this.broadcast(BROADCAST_FISH_TIDE, {pathinfo: pathInfo, tracktime: trackTime, deadfishs: deadfishs});
            }else {
                //this.themeScene.refreshTrackByTime();
                if(this.switchSceneStatus != 2) {
                    //console.log('this.switchSceneStatus != 2 ');
                    var path = this.themeScene.refreshTrackByTime();
                    if (path != undefined && path.length > 0) {
                        // 广播path重置
                        //console.log('==4212==>path: ', path)
                        this.broadcast(BROADCAST_SYNC_TRACK_RESET, {tracks: path});
                    } else {
                        if (now - this.lastUpdateTime > TRACK_UPDATE_BROADCAST_INTERVAL) {
                            // 广播trackTime
                            var tempTracktime = this.themeScene.getCurrentTrackTime(this.isFistUpdateTrackTime);
                            //console.log('==tempTracktime==>4211: ', tempTracktime, this.isFistUpdateTrackTime)
                            this.broadcast(BROADCAST_SYNC_TRACK_TIME, {tracktime: tempTracktime});
                            this.lastUpdateTime = now;
                            this.isFistUpdateTrackTime = false;
                        }
                    }
                }
            }
        }else{
            if(this.themeScene.refreshTrackByTimeByFishType(global.fishTrackType.FishTide) == true){
                logger.debug('==11111=====> fishTideState = false');
                this.fishTideState = false;  /// 鱼潮结束
                this.isFistUpdateTrackTime = true; ///是否是鱼潮结束后第一次同步时间
            }
        }
        /// 同步奖金池金币数
        if (this.time % 10 == 0 && this.timeoutSwitch) {
            var num = Math.floor(this.goldPool);
            this.broadcast(BROADCAST_GOLD_POOL, {goldPool: num, energy: 0});
        }
        if (!this.timeoutSwitch && this.time % 15 == 0) {
            this.timeoutSwitch = true;
        }
    }
    else{
        if(this.qieLockScreenTime > 0){
            this.qieLockScreenTime ++;
            if(this.qieLockScreenTime >= 10){
                this.qieLockScreenTime = 0;
                this.broadcast(BROADCAST_BOMB_LOCKSCREEN, {isLockScreen: this.qieLockScreenTime});
            }
        }
        if(this.bombLockScreenTime > 0) {
            this.bombLockScreenTime++;
            if (this.bombLockScreenTime >= 8) {
                this.bombLockScreenTime = 0;
                this.broadcast(BROADCAST_BOMB_LOCKSCREEN, {isLockScreen: this.bombLockScreenTime});
            }
        }
    }

};

ThemeRoom.prototype.getCoefficientByPosition = function () {
    var self = this;
    //TODO 根据位置获得捕获系数
    var randArr = [];
    for (var i = 0; i < 8; i++) {
        var info = {zheng: 0, fu: 0};
        randArr.push(info);
    }
    var zhengObj2 = {};
    var fuObj2 = {};

    var randomFun = function (objArr) {

        var zhengObj = {};
        var fuObj = {};
        var num = 2;
        var Coefficient = [0, 0, 0, 0, 0, 0, 0, 0];
        /// 刷选2个正的
        for (var i = 0; i < 10000; i++) {

            var index = Math.floor(Math.random() * objArr.length);
            var _obj = objArr[index];

            if (_obj.zheng > 0) {
                if (Object.keys(zhengObj2).length >= 8) {
                    break;
                }
                i--;
                continue;
            }
            if (num <= 0) {
                break;
            }
            _obj.zheng = 1;

            zhengObj[index] = _obj;
            zhengObj2[index] = _obj;
            Coefficient[index] = Number(global.capture[self.typeId].position_coefficient.split("|")[0]);
            num--;
        }

        ///刷选2个负的
        num = 2;
        for (var i = 0; i < 10000; i++) {
            var index = Math.floor(Math.random() * objArr.length);
            var _obj = objArr[index];
            if (_obj.fu > 0 || zhengObj[index] != undefined) {
                if (Object.keys(fuObj2).length >= 8) {
                    break;
                }
                i--;
                continue;
            }
            if (num <= 0) {
                break;
            }

            _obj.fu = 1;
            fuObj[index] = _obj;
            fuObj2[index] = _obj;
            Coefficient[index] = Number(global.capture[self.typeId].position_coefficient.split("|")[1]);
            num--;
        }

        for (var i = 0; i < objArr.length; i++) {
            if (zhengObj[i] != undefined) {
                objArr[i] = zhengObj[i];
            }
            if (fuObj[i] != undefined) {
                objArr[i] = fuObj[i];
            }
        }
        //return objArr;
        return Coefficient;
    }

    if(this.time % this.refreshtime == 0 &&this.time % (4*this.refreshtime) != 0){
        this.randArr11 = randomFun(randArr);
        return this.randArr11;
    }
    if(this.time % (4*this.refreshtime) == 0){
        randArr = [];
        for (var i = 0; i < 8; i++) {
            info = {zheng: 0, fu: 0};
            randArr.push(info);
        }
        zhengObj2 = {};
        fuObj2 = {};
        this.randArr11 = randomFun(randArr);
        return this.randArr11;
    }

    return this.randArr11;
};

//////房间系数
ThemeRoom.prototype.getCoefficientByRoom = function () {

    this.currentProfit += (this.fireValuePool - this.retgold);//房间当前盈利值

    if(this.currentProfit >= global.capture[this.typeId].room_coefficient_a*1*this.weaponMax){//2
        this.state = 1;
        this.roomcoefficient = global.capture[this.typeId].room_coefficient_b1;
        this.currentProfitC1 = this.currentProfit;//达到盈利阈值是房间最高盈利值
        //console.log('-----------------------this.roomcoefficient,this.currentProfitC1',this.roomcoefficient,this.currentProfitC1);
    }
    if(this.currentProfit <= (1-global.capture[this.typeId].room_coefficient_d*1)*this.currentProfitC1) {//3
        this.state = 0;
        this.roomcoefficient = 0;
        this.currentProfitE1 = this.currentProfit;//第一次抽放水过后的盈利值
        this.currentProfit = 0;
        this.currentProfitC1 = -10000000000;
        //console.log('-----------------------this.roomcoefficient,this.currentProfitE1',this.roomcoefficient,this.currentProfitE1);
    }
    if(this.currentProfit <= -global.capture[this.typeId].room_coefficient_a*1*this.weaponMax){//4
        this.state = -1;
        this.roomcoefficient = global.capture[this.typeId].room_coefficient_b2;
        this.currentProfitC2 = this.currentProfit;//达到亏损阈值是房间最高亏损值
        //console.log('-----------------------this.roomcoefficient,this.currentProfitC2',this.roomcoefficient,this.currentProfitC2);
    }
    if(this.currentProfit >= (1-global.capture[this.typeId].room_coefficient_d*1)*this.currentProfitC2){//5
        this.state = 0;
        this.roomcoefficient = 0;
        this.currentProfitE2 = this.currentProfit;//第二轮放抽水过后的盈利值
        this.currentProfit = 0;
        this.currentProfitC2 = 10000000000;
        //console.log('-----------------------this.roomcoefficient,this.currentProfitE2',this.roomcoefficient,this.currentProfitE2);
    }

    this.currentProfitEP = this.currentProfitE1 + this.currentProfitE2;//总的盈利值
  return this.roomcoefficient;
}

ThemeRoom.prototype.getTaxTotal = function () {
    return {currentProfitEP:this.currentProfitEP*1};
}
ThemeRoom.prototype.getTax = function (roomType) {
    return {state:this.state,currentProfitEP:this.currentProfit*1,coefficient:this.getGmCoefficient(roomType)};
}
//debug数值查询
ThemeRoom.prototype.getTaxAgain = function (player) {
    return {currentProfitEP:this.currentProfitEP*1,coefficient:this.getGmCoefficient(this.typeId)*1+global.capture[this.typeId].basics_coefficient*1+player.rechargeCoefficient *1+ player.noviceCoefficient *1+
    this.getPersonCoefficientByPosition(player.pos)*1+ this.getCoefficientByRoom()*1,
    basicsCoefficient:global.capture[this.typeId].basics_coefficient*1,rechargeCoefficient:player.rechargeCoefficient *1,
    noviceCoefficient:player.noviceCoefficient *1,posCoefficient:this.getPersonCoefficientByPosition(player.pos)*1,roomCoefficient:this.getCoefficientByRoom()*1};
}
ThemeRoom.prototype.getPersonCoefficientByPosition = function (pos) {
    var ArrposCoefficient = this.getCoefficientByPosition();
    for(var i = 0;i< ArrposCoefficient.length;i++){
        if(pos == i){
            return ArrposCoefficient[i];
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
ThemeRoom.prototype.changeStatus = function (status) {
    this.status = status;
    this.emit(EVENT_STATUS_CHANGE, status);
};

//=======================供player调用========================

/**
 * 进入房间
 * @param player{Player} 进入房间的玩家
 * @return{Number}返回记过以int表示
 *      0 - 进入成功
 *      1 - 密码不正确
 *      2 - 房间满
 * */
ThemeRoom.prototype.enterRoom = function (player) {
    logger.info("ThemeRoom.enterRoom: entered.");
    if (this.pwd && player.pwd != this.pwd) {
        // 密码不对 拒绝进入
        return 1;
    }

    if (this.status == 2) {
        //房间满员不可进入
        return 2;
    }
    for (var i = 0; i < this.playerPos.length; i++) {
        if (this.playerPos[i] == -1) {
            this.playerPos[i] = player;
            break;
        }
    }
    this.playerCount++;
    if (this.playerCount == this.size) {
        this.changeStatus(2);//房间满员
    }
    player.initWeaponType(this.themeScene.weaponList[0]); //一定要放在广播BROADCAST_ENTER消息前面
    for (var i = 0; i < this.themeScene.weaponList.length; i++) {
        var weaponInfo = global.getWeaponDataById(this.themeScene.weaponList[i]);
        if(weaponInfo == undefined){
            continue;
        }
        if(this.weaponMax < weaponInfo.multiple *1){
            this.weaponMax = weaponInfo.multiple *1;
        }
    }
    //this.weaponMax = Math.max.apply(null, this.themeScene.weaponList2);
    player.pos = this.playerPos.indexOf(player);
    this.lastUpdateTime = Date.now();
    this.broadcast(BROADCAST_ENTER, {
        userInfo: player.getUserInfo()
        //,tracktime: this.themeScene.getCurrentTrackTime()
    }); // 向房间内所有玩家进行广播
    this.emit(EVENT_ENTER, player.uid);

    countUserRoomDao.incr(this.typeId, function(){});
    player.fire_time = this.life_time;

    if(player.level ==1&& player.gold <=global.other[1].gold_quota){
        player.noviceCoefficient = global.levelInfo[1].novice_coefficient*1;
    }
    //logger.info("ThemeRoom.enterRoom: leaved.");
    return 0;
};

//切换位置
ThemeRoom.prototype.changeSite = function (player, toSite) {

    var site = this.playerPos.indexOf(player);

    if (toSite >= this.size) {
        //超过room的最大值了  给client一个err
        return 20001;
    }

    if (site < 0 || site == toSite) {
        //无视 不在这个房间内或者位置不变
        return 20002;
    }

    if (this.playerPos[toSite] != -1) {
        //要去的位置不空  返回给client一个err
        return 20003;
    }

    this.playerPos[site] = -1;
    this.playerPos[toSite] = player;
    player.pos = toSite;
    var sites = [];
    for (var i = 0; i < this.playerPos.length; i++) {
        if (this.playerPos[i] != -1) {
            sites.push({
                pos: i + 1,//客户端pos从1开始计算
                uid: this.playerPos[i].uid
            });
        }
    }

    this.broadcast(BROADCAST_CHANGE_SITE, {site: sites, uid:player.uid}); // 向房间内部进行广播 包含所有玩家位置信息
    return 0;
};

/* *
 * 获取房间信息
 * 房间内的player信息
 * 房间当前track信息
 * 房间内当前死鱼信息
 * 房间内路径信息
 * 房间本身信息
 * */
ThemeRoom.prototype.getRoomInfo = function () {
    var playerInfo = [];
    var onlineInfo = {
        uid: [],
        cardId: [],
        topEnergy: 0//this.themeScene.fishFarmConfig.Energy_Stored_Up
    };

    var players = this.playerPos;
    for (var index in players) {
        if (players[index] != -1) {
            onlineInfo.uid.push(players[index].uid);
            if(players[index].getUserInfo().name == 'sth'){
                console.log('++Room==getRoomInfo=>index, player: ',index, players[index].getUserInfo());
            }
            playerInfo.push(players[index].getUserInfo());
        }
    }

    //console.log('++getRoomInfo++++====>trackCount: ', JSON.stringify(this.themeScene.trackCount));
    var pathInfo = {};//this.themeScene.fishManager.getRandomPathInfos();
    var trackTime = [];//this.themeScene.getTrackTimeInfo(this.fishTideState);
    if(this.switchSceneStatus == 0)
    {
        pathInfo = this.themeScene.fishManager.getRandomPathInfos();
        trackTime = this.themeScene.getTrackTimeInfo(this.fishTideState);
    }
    var deadFish = [];
    for(var aKey in this.themeScene.allFishFarmTrackIds){
        var tempTrackIds = this.themeScene.allFishFarmTrackIds[aKey];
        for (var i = 0; i < tempTrackIds.length; i++) {
            var trackFish = {};
            trackFish.trackId = tempTrackIds[i];
            trackFish.fishIds = this.themeScene.fishManager.getDeadFishListByTrackId(trackFish.trackId);
            deadFish.push(trackFish);
        }
    }

    /// 任务鱼存入临时数组*内存中是用对象存储*
    var curFishNums = [0,0,0,0,0,0,0,0];
    for(var tKey in this.taskFishIdOfPos){
        /// tKey 是从1开始记录
        curFishNums[tKey] = this.taskFishIdOfPos[tKey].fishNum *1;
    }

    //console.log('=++getRoomInfo++=>pathInfo: ',JSON.stringify(pathInfo));
    //console.log('=+++++++getRoomInfo++=>trackTime: ',trackTime);
    //console.log('---------------------------this.fishFarmId',this.fishFarmId);
    return {
        userList: playerInfo,
        onlineInfo: onlineInfo,
        pathinfo: pathInfo,
        tracktime: trackTime,
        deadfishs: deadFish,
        curFishFarmId: this.fishFarmId,
        curTaskFishInfo: curFishNums,
        targetTaskFishNum: global.capture[this.typeId].task_fish_num *1,
        taskFishType: global.capture[this.typeId].task_fish_id *1,
        goldPool: this.goldPool,
        explosionQiLin: this.explosionQiLin
    };
};

/**
 * 超时T出房间
 */
ThemeRoom.prototype.kickUserOverTime = function () {
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
ThemeRoom.prototype.kickRoom = function (player) {
    if(!player || player == -1){
        console.log("--==> Theme KickRoom ERR, player = ", player);
        return;
    }
    var pos = this.playerPos.indexOf(player);
    if(pos < 0 || pos > this.playerPos.length -1){
        console.log("--==> Theme KickRoom ERR, pos, uid, name = ",pos, player.uid, player.name);
        return;
    }
    this.playerPos[pos] = -1;
    this.playerCount--;
    //this.emit(EVENT_LEAVE, player.uid);
    //player.rpcMsg(FORCE_OFFLINE_RPCID, {uid: player.uid});
    if (this.status == 2) {
        this.changeStatus(1);
    }

    if (this.playerCount == 0) {
        this.close();
    }

    countUserRoomDao.decr(this.typeId, function(){});
};

ThemeRoom.prototype.msgKickFront = function (player) {

}

ThemeRoom.prototype.expression = function (player,messageId,messageContent,cb) {
    this.broadcast(BROADCAST_ROOM_TALK, {
        name: player.name,
        pos: player.pos
        , messageId: messageId, messageContent: messageContent
    });
    cb(null);
};

ThemeRoom.prototype.giftGive = function (player,id,uid,fid,cb) {
    this.broadcast(BROADCAST_GIFT_GIVE, {
        id: id,
        uid: uid,
        giftId: fid
    });
    cb(null);
};

//离开房间
ThemeRoom.prototype.leaveRoom = function (player,cb) {
    var pos = this.playerPos.indexOf(player);
    if(pos < 0 || pos > this.playerPos.length -1){
        cb(1, null);return;
    }
    this.playerPos[pos] = -1;
    this.playerCount--;
    this.emit(EVENT_LEAVE, player.uid);
    if (this.status == 2) {
        this.changeStatus(0);
    }
    this.broadcast(BROADCAST_LEAVE, {uid: player.uid});
    if(player.captureWeaponFish != undefined && Object.keys(player.captureWeaponFish).length >0){
        this.themeScene.weaponFishEnergy = 0;
        //this.broadcast(BROADCAST_WEAPON_ENERGY, {curWeaponEnergy: 0});
        this.themeScene.setSpceialWeaponTrackTime(false);
        player.captureWeaponFish = {};
    }
    if (this.playerCount == 0) {
        this.close();
    }

    countUserRoomDao.decr(this.typeId, function(){});
    cb(null,{level:player.level,experience:player.experience});
};

//开火
ThemeRoom.prototype.fire = function (player, x, y, value) {
    if(value == null || value == undefined){
        value = 0;
    }
    this.fireValuePool = value;
    value = value * 0.01; /// 开炮有1%的金币会存入奖池
    this.goldPool += value;
    if(this.goldPool >= 999999999){
        this.goldPool = 999999999;  /// 最大数值是9.9亿
    }


    this.broadcast(BROADCAST_FIRE, [player.getPos(), x, y], [player]);

    //更新开火时间
    player.fire_time = this.life_time;

    if(player.gold <=global.other[1].gold_quota){
        player.noviceCoefficient = global.getLevelByExperience(player.experience).noviceCoefficient;
    }else {
        player.noviceCoefficient = 0;
    }
};
ThemeRoom.prototype.subsidyReward = function (uid,gold,gem,coupon) {
    this.broadcast(BROADCAST_ACCEPT_GOLD, {uid:uid,currencyUnit:{gold:gold,gem:gem,coupon:coupon}});
};
//特殊武器开火
ThemeRoom.prototype.specialFire = function (player, x, y, weaponType) {
    this.broadcast(BROADCAST_SPECIAL_FIRE, {playerIndex:player.getPos(), weaponType:weaponType, fireX:x, fireY:y}, [player]);
    //更新开火时间
    player.fire_time = this.life_time;
};

/**
 * 碰撞 room负责广播结果 具体计算在scene中进行
 * @return{object}掉落列表
 * */
ThemeRoom.prototype.explosion = function (player, weapon, fishes ,isFullCapture, bombValue, finalExplode) {
    
    var ret = {gold:0, list:[],deadFish:[]};  ///gold字段只存了彩金的奖励
    var posCoefficient = 0;
    var ArrposCoefficient = this.getCoefficientByPosition();
    for(var i = 0;i< ArrposCoefficient.length;i++){
        if(player.pos == i){
            posCoefficient = ArrposCoefficient[i];
        }
    }
    var roomcoefficient = this.getCoefficientByRoom();
    /// 充值系数
    var costquota = player.costQuota*1;
    var costquotaPool = player.costquotaPool*1;
    if(costquotaPool >= costquota){
        player.rechargeCoefficient = 0;
    }

    /// tempCoefficient = 充值系数 + 等级系数 + 位置系数 + 房间系数
    var tempCoefficient = this.getGmCoefficient(this.typeId)*1+player.rechargeCoefficient *1+ player.noviceCoefficient *1+ posCoefficient *1+ roomcoefficient *1;

    var boxPropRate = 0;
    /// vip等级大于等于7级后,每相差1级掉落系数累加 box_rate (0.1000)
    if(player.vipLv *1 >= 7){
        boxPropRate = (1 + player.vipLv - 7) * global.other[1].box_rate *1;
    }
    boxPropRate += player.cardBoxPropRate*1;
    
    var result = this.themeScene.capture(1, fishes, weapon, isFullCapture, this.explosionQiLin, bombValue, boxPropRate, tempCoefficient, finalExplode);

    // 获取到结果后进行广播 并返回player需要的结果(划掉)
    //返回将死鱼进行广播 并返回计算信息给player
    if(result.explosionQiLin != undefined){
        this.explosionQiLin = result.explosionQiLin;
    }

    if (result.deadFish.length > 0) {
        var totalExperience = 0;  /// 记录此次能获得经验值
        /// 记录彩金系统的任务鱼条数
        for(var i = 0; i<result.deadFish.length; i++){
            //根据类型获取鱼的基础配置信息
            var fishType = this.themeScene.fishManager.getFishTypeById(result.deadFish[i].fishId);
            var fishInfo = global.getFishInfoByIndex(fishType);
            if(fishInfo == undefined){
                continue;
            }

            if(result.deadFish[i].experience > 0)
                totalExperience += result.deadFish[i].experience*1;

            if(fishType *1 == global.capture[this.typeId].task_fish_id){
                if(this.taskFishIdOfPos[player.pos] == undefined){
                    this.taskFishIdOfPos[player.pos] = {fishNum: 0, weaponMultiple: 0};
                }
                this.taskFishIdOfPos[player.pos].fishNum += 1;
                this.taskFishIdOfPos[player.pos].weaponMultiple += weapon.multiple *1;

                //// 满足条数后发放奖励
                if(this.taskFishIdOfPos[player.pos].fishNum >= global.capture[this.typeId].task_fish_num *1){
                    //// 奖励公式：(Y1+Y2+Y3+Y4+Y5)/5*随机系数/房间最大炮倍*奖池
                    var tWeaponMul = this.taskFishIdOfPos[player.pos].weaponMultiple;
                    var tFishTotalNum = global.capture[this.typeId].task_fish_num;
                    var probability = Math.ceil(Math.random() * 10000);
                    var randNum = 0, weigthNum = 0, rewardId = 0;
                    for(var bKey in global.bonus){
                        weigthNum += global.bonus[bKey].probability *1;
                        if(weigthNum >= probability) {
                            randNum = global.bonus[bKey].random_coefficient *1;
                            rewardId = bKey *1;
                            break;
                        }
                    }
                    ///求出武器的最大倍率
                    var maxMultiple = 1;
                    for(var w =0; w < this.themeScene.weaponList.length; w++){
                        var weaponId = this.themeScene.weaponList[w];
                        if(maxMultiple < global.getWeaponDataById(weaponId).multiple *1){
                            maxMultiple = global.getWeaponDataById(weaponId).multiple *1;
                        }
                    }

                    var rewardGold = (tWeaponMul /tFishTotalNum * randNum / maxMultiple /10000) * this.goldPool;
                    ret.gold = Math.floor(rewardGold);
                    this.goldPool -= rewardGold;
                    this.taskFishIdOfPos[player.pos].fishNum = 0;
                    this.taskFishIdOfPos[player.pos].weaponMultiple = 0;
                    this.timeoutSwitch = false;
                    this.broadcast(BROADCAST_TASKFISH_REWARD,{
                        matchType: 10,
                        reward: Math.floor(rewardGold),
                        rewardId: rewardId,
                        position: player.pos +1,
                        newGoldPool: Math.floor(this.goldPool + rewardGold)});
                    /// 任务鱼完成时,如果主题剩余时间小于动画时间
                    if(this.themeScene.fishFarmConfig.Scensetime - this.time < TASK_FISH_ANIMATION_TIME){
                        this.time -= TASK_FISH_ANIMATION_TIME - (this.themeScene.fishFarmConfig.Scensetime - this.time);
                    }
                    //---------全服通告----------
                    if(rewardId ==5){
                        sendTransfeServerByEvent(player, 2, {fishId:0 ,fishGold:0,matchId:this.typeId,rewardGold:rewardGold});
                    }
                }
            }
            ///  大Boss死亡后,如果主题剩余时间小于鱼的死亡动画时间
            if(fishInfo.fish_type == 3){
                if(this.themeScene.fishFarmConfig.Scensetime - this.time < BIG_BOSS_DIE_ANIMATION_TIME){
                    this.time -= BIG_BOSS_DIE_ANIMATION_TIME - (this.themeScene.fishFarmConfig.Scensetime - this.time);
                }
            }
            //---------全服通告------
            if(fishInfo.fish_type == 3 && result.deadFish[i].gold*1 >= global.other[1].gold_condition*1){
                sendTransfeServerByEvent(player, 1,{fishId:fishInfo.id ,fishGold:result.deadFish[i].gold*1,matchId:this.typeId,rewardGold:0});
            }

            if(fishInfo.fish_type == 4){ ///是否捕获了特殊武器鱼
                player.captureWeaponFish.fishType = fishType *1; /// 鱼的索引
                player.captureWeaponFish.weaponInfo = weapon; /// 当前武器信息
                this.themeScene.setSpceialWeaponTrackTime(true);
                this.weaponEnergyInfo = [this.themeScene.weaponFishEnergy,this.themeScene.totalWeaponEnergy];
            }


            if(fishInfo.name == "qilin"){
                this.explosionQiLin = 0;  ///捕获成功则清零
            }
            else if(fishInfo.name == "bomb"){
                this.bombLockScreenTime = 1;
                player.setBombWeapon(weapon);
                this.broadcast(BROADCAST_BOMB_LOCKSCREEN, {isLockScreen: this.bombLockScreenTime});
            }
            else if(fishInfo.name == "qie"){
                this.qieLockScreenTime = 1;
                this.broadcast(BROADCAST_BOMB_LOCKSCREEN, {isLockScreen: this.qieLockScreenTime});
            }
            else if(fishInfo.name == "xiaocaishen"){
                var newCount = Number(this.themeScene.trackCount[global.fishTrackType.SmallBoss][this.themeScene.curSmallBossIndex]) * 1.5;
                this.themeScene.trackCount[global.fishTrackType.SmallBoss][this.themeScene.curSmallBossIndex] = Math.floor(newCount);
                var newTrackTime = Number(this.themeScene.trackTime[global.fishTrackType.SmallBoss][this.themeScene.curSmallBossIndex]) *1.5;
                this.themeScene.trackTime[global.fishTrackType.SmallBoss][this.themeScene.curSmallBossIndex] = Math.floor(newTrackTime);
                var index = this.themeScene.curSmallBossIndex;
                /*if(index > 0){
                    index = index -1;
                }*/
                this.themeScene.allFishFarmTrackIds[global.fishTrackType.SmallBoss][index] = "440";

                this.broadcast(BROADCAST_SYNC_TRACK_TIME, {tracktime: this.themeScene.getCurrentTrackTime()});
            }
            else if(fishInfo.name == "dacaishen"){
                var index = this.themeScene.curSmallBossIndex;
                /*if(index > 0){
                    index = index -1;
                }*/
                this.themeScene.allFishFarmTrackIds[global.fishTrackType.SmallBoss][index] = "430";
            }
        }
        /// 判断是否升级
        if(totalExperience > 0) {
            player.experience = player.experience * 1 + totalExperience;
            var newLevelInfo = global.getLevelByExperience(player.experience);  //拿到经验值对应等级相关信息
            if (player.level < newLevelInfo.level) {
                player.level = newLevelInfo.level;

                ret.levelReward = {type: newLevelInfo.reward_type, number: newLevelInfo.reward_num};
                this.broadcast(BROADCAST_UP_GRADE, {playerIndex: player.pos + 1, level: player.level, experience: player.experience});
            }
        }

        this.broadcast(BROADCAST_CAPTURE, [player.getPos(), result.deadFish, isFullCapture]);
    }
    else {
        for (var i = 0; i < fishes.length; i++) {
            var fishType = this.themeScene.fishManager.getFishTypeById(fishes[i]);
            var fishInfo = global.getFishInfoByIndex(fishType);
            if (fishInfo == undefined) {
                continue;
            }
            if (fishInfo.name == "qilin") {
                this.broadcast(BROADCAST_QILIN_VALUE, {qiLinValue: this.explosionQiLin});
            }
        }
    }

    if(result.drop != undefined) {
        for(var dKey in result.drop){
            var tempDropList = [];
            var tempGemNum = 0;
            if(result.drop[dKey] != undefined && result.drop[dKey].propList != undefined){
                var list = result.drop[dKey].propList;
                for(var l = 0; l <list.length; l++){
                    if(list[l] != undefined) {
                        tempDropList.push({propID: list[l].id, propType: list[l].type, propNum: list[l].num})
                    }
                }
            }
            if(result.drop[dKey] != undefined && result.drop[dKey].gemNum != undefined){
                tempGemNum = result.drop[dKey].gemNum *1;
            }
            if(tempDropList.length > 0 || tempGemNum > 0){
                this.broadcast(BROADCAST_PROPDATA_DROP, {playerIndex: player.getPos(), fishId: dKey, dataPropList: tempDropList, gemNum: tempGemNum});
            }
        }
    }

    if(finalExplode != undefined) {
        var tempWeaponEnergy = 0;
        if(this.themeScene.weaponFishEnergy > 0 && finalExplode == 0) {
            tempWeaponEnergy = this.themeScene.weaponFishEnergy;
        }else{
            this.themeScene.setSpceialWeaponTrackTime(false);
        }
        this.broadcast(BROADCAST_WEAPON_ENERGY, {curWeaponEnergy: tempWeaponEnergy});
    }
    ret.list = result.drop;
    ret.deadFish = result.deadFish;
    return ret;
};

//使用卡牌
ThemeRoom.prototype.useCard = function (player) {
};

//使用技能
ThemeRoom.prototype.useSkill = function (player, skillId, is, skillCoefficient) {
    //TODO 根据房间配置进行切换武器检测
    this.themeScene.setSkillCoefficient(skillCoefficient);
    this.broadcast(BROADCAST_USE_SKILL, {uid: player.uid, skillId: skillId, isOpen: is}, [player]);
    return true;
};


//切换武器
ThemeRoom.prototype.changeWeapon = function (player, index) {
    //TODO 根据房间配置进行切换武器检测

    if (!this.themeScene.checkWeaponLegal(index)) {
        console.log('unlawful weapon index');
        return false;
    }
    console.log('change weapon');
    this.broadcast(BROADCAST_CHANGE_WEAPON, {uid: player.uid, weaponid: index});
    return true;
};

//切换皮肤
ThemeRoom.prototype.changeSkin = function (guid, skinId) {
    this.broadcast(BROADCAST_CHANGE_SKIN, {uid: guid, skinType: skinId});

};

var sendTransfeServerByEvent = function(player, noticeType, param) {
    if(player == undefined || noticeType == undefined || param == undefined){
        return false;
    }

    //console.log('==sendTransfeServerByEvent==>noticeType, param: ', noticeType, param);
    var rpcTS = roomManager.rpcManager.getRpcByRType("TransfeServer");
    if (!rpcTS) {
        logger.err('RoomServer.ThemeRoom.sendTransfeServerByEvent: failed to getRpcByRType');
        return false;
    }

    var methodTS = rpcTS.getMethod('sendFullServerNotice');
    if (!methodTS != undefined) {
        logger.err('RoomServer.ThemeRoom.sendTransfeServerByEvent: failed to getMethod(sendFullServerNotice)');
        return false;
    }

    methodTS({
        noticeType: noticeType,
        playerInfo:{uid:player.uid,pos:player.pos,headurl:player.headurl,name:player.name},
        fishInfo: param,
        content: ""
    }, function (err) {
        if(err != undefined|| err != null) {
            logger.err('RoomServer.ThemeRoom.sendTransfeServerByEvent: err: ',err);
        }
    });
    return true;
}
//==============player调用结束===========================
ThemeRoom.prototype.changeCoefficient = function(roomType,gmCoefficient){
    //console.log('------------------------gmCoefficient',gmCoefficient);
    if(!this.gmCoefficient[roomType]){
        this.gmCoefficient[roomType] = gmCoefficient;
    }else {
        this.gmCoefficient[roomType] += gmCoefficient;
    }

}
ThemeRoom.prototype.getGmCoefficient = function(roomType){
    //console.log('------------------------gmCoefficient',gmCoefficient);
    if(!this.gmCoefficient[roomType]){
        return 0;
    }
    return this.gmCoefficient[roomType];
}