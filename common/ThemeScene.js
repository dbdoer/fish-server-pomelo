/**
 * Created by xiahou on 2016/10/16.
 * 场景信息
 * 不同类型场景体现
 * 场景信息包括
 *      鱼的路径信息
 *      炮的各种限制检测
 *      掉落几率&掉落列表
 *      事件
 *      计时器
 *      捕获检测
 */

var FishManager = require('./FishManager');
var commons = require('./commons');
var logger = require("./logHelper").helper;
var _underscore = require('underscore');
module.exports = function (fishFarmIndex, matchTypeId, lastFishTideId, weaponEnergyInfo) {
    return new ThemeScene(fishFarmIndex, matchTypeId, lastFishTideId, weaponEnergyInfo);
};
function ThemeScene(fishFarmIndex, matchTypeId, lastFishTideId, weaponEnergyInfo) {
    this.fishManager = FishManager();
    this.fishFarmConfig = global.getFishFarmDataByIndex(fishFarmIndex);  ///主题场景所有数据
    //根据curFishFarmId获取配置信息
    /*console.log('----------------------------fishFarmIndex ThemeScene',fishFarmIndex);
    console.log('----------------------------lastFishTideId ThemeScene',lastFishTideId);*/
    this.allFishFarmTrackIds = global.getTrackIdsByFishFarmId(fishFarmIndex, lastFishTideId);  ///主题场景路径数据
    //console.log('----------------------------this.allFishFarmTrackIds',this.allFishFarmTrackIds);
    /// 鱼的价值
    this.allTrackFishValues = {};
    /// 当前鱼潮路径ID
    this.curFishTideTrackId = this.allFishFarmTrackIds[global.fishTrackType.FishTide][0];
    this.trackCount = {};//[];
    this.trackTime = {};//[];
    this.trackTimeIsStart = {};
    this.closeUpdateTrackCount = false;

    this.curSmallBossIndex = 0;
    this.curBigBossIndex = 0;
    this.curSpweaponIndex = 0;
    this.dropPropTypes = []; /// 场次能掉落的物品类别
    this.weaponFishEnergy = 0;
    this.totalWeaponEnergy = 0;
    if(weaponEnergyInfo != undefined && weaponEnergyInfo.length > 0){
        this.weaponFishEnergy = weaponEnergyInfo[0] *1 || 0;
        this.totalWeaponEnergy = weaponEnergyInfo[1] *1 || 0;
    }
    this.init(matchTypeId);
    this.getTrackFishValues();  ///
}
/**
 * 得出所有路径下的value_type为2的鱼价值
 * */
ThemeScene.prototype.getTrackFishValues = function(trackId){

    if(trackId == undefined) {
        /// 参数为空值时,代表查找全部
        for (var aKey in this.allFishFarmTrackIds) {
            for (var i = 0; i < this.allFishFarmTrackIds[aKey].length; i++) {
                var trackId = this.allFishFarmTrackIds[aKey][i];
                var tempTrack = global.getTrackDataByTrackId(trackId);
                // console.log('=11111==>tempTrack: ',tempTrack);
                if (tempTrack != undefined) {
                    //// 找其中一个就可以
                    if (!_underscore.isArray(tempTrack.waves.wave)) {
                        tempTrack.waves.wave = [tempTrack.waves.wave];
                    }
                    var tPath = tempTrack.waves.wave[0].path;
                    if (!_underscore.isArray(tPath)) {
                        tPath = [tPath];
                    }
                    var fishInfo = global.getFishInfoByIndex(tPath[0].fish_type);
                    var tempValue = 0;
                    //console.log('=11111==>fishInfo: ',fishInfo.value_type,fishInfo.value_low,fishInfo.value_high);
                    if (fishInfo.value_type == 2) {
                        var temp = (fishInfo.value_high * 1 - fishInfo.value_low * 1) / fishInfo.value_interval * 1;
                        temp = Math.ceil(Math.random() * temp);  ///取上限值
                        tempValue = temp * fishInfo.value_interval * 1 + fishInfo.value_low * 1;
                        this.allTrackFishValues[tPath[0].fish_type] = tempValue;
                    }
                }
            }
        }
    }else{
        /// 参数不为空值时,代表查找指定
        /*var trackTypeInfo = this.allFishFarmTrackIds[trackType];
        if(trackTypeInfo != undefined){
            for (var i = 0; i < trackTypeInfo.length; i++) {
                if(trackTypeInfo[i] != undefined && trackTypeInfo[i] == trackId){

                }
            }
        }*/
        var tempTrack = global.getTrackDataByTrackId(trackId);
        if (tempTrack != undefined) {
            //// 找其中一个就可以
            if (!_underscore.isArray(tempTrack.waves.wave)) {
                tempTrack.waves.wave = [tempTrack.waves.wave];
            }
            var tPath = tempTrack.waves.wave[0].path;
            if (!_underscore.isArray(tPath)) {
                tPath = [tPath];
            }
            var fishInfo = global.getFishInfoByIndex(tPath[0].fish_type);
            //console.log('=222==>trackId, fishInfo: ',trackId, fishInfo.value_type,fishInfo.value_low,fishInfo.value_high);
            if (fishInfo.value_type == 2) {
                var temp = (fishInfo.value_high * 1 - fishInfo.value_low * 1) / fishInfo.value_interval * 1;
                temp = Math.ceil(Math.random() * temp);  ///取上限值
                tempValue = temp * fishInfo.value_interval * 1 + fishInfo.value_low * 1;
                this.allTrackFishValues[tPath[0].fish_type] = tempValue;
            }
        }
    }

    //console.log('=11111==>getTrackFishValues: ',this.allTrackFishValues);
}
/**
 * 计算所有鱼路径的时间
 * */
ThemeScene.prototype.computeTrackTime = function (fishTrackType) {
    /// 重置指定类型的
    if(fishTrackType != undefined || fishTrackType != null){
        var trackIdArr = this.allFishFarmTrackIds[fishTrackType];
        //console.log('=++computeTrackTime++=>trackIdArr: ',trackIdArr);
        if(trackIdArr == undefined){
            return;
        }
        var countArr = this.trackCount[fishTrackType] || [];
        var timeArr = this.trackTime[fishTrackType] || [];
        for (var i = 0; i < trackIdArr.length; i++)
        {
            var r = this.fishManager.getScreenCountAndTimeByTrackId(trackIdArr[i]);
            countArr[i] = -1;
            timeArr[i] = r.screen_time * 1;
        }
    }
    else { /// 重置所有类型的
        for (var aKey in this.allFishFarmTrackIds) {
            for (var i = 0; i < this.allFishFarmTrackIds[aKey].length; i++) {
                if (this.trackCount[aKey] == undefined) {
                    this.trackCount[aKey] = [];
                }
                if (this.trackTime[aKey] == undefined) {
                    this.trackTime[aKey] = [];
                }

                var r = this.fishManager.getScreenCountAndTimeByTrackId(this.allFishFarmTrackIds[aKey][i]);
                var tt = r.screen_time * 1;
                if (aKey == global.fishTrackType.SmallBoss) {
                    if(i == 0) {
                        tt = global.capture[this.matchTypeId].first_boss_time *1;
                        this.trackTimeIsStart[aKey] = tt;
                    }
                }
                else if (aKey == global.fishTrackType.BigBoss) {
                    if(i == 0) {
                        tt = global.capture[this.matchTypeId].first_big_boss_time *1;
                        this.trackTimeIsStart[aKey] = tt;
                    }
                }
                else if (aKey == global.fishTrackType.Spweapon) {
                    if(i == 0) {
                        tt = global.specialInfo.first_fish *1;
                        this.trackTimeIsStart[aKey] = tt;
                    }
                }
                this.trackCount[aKey][i] = -1;
                this.trackTime[aKey][i] = tt; //每个track总耗时
            }
        }
    }
};
/**
 * 根据配置进行初始化
 * */
ThemeScene.prototype.init = function (matchTypeId) {
    //console.log('------------------------init ThemeScene');
    var self = this;
    this.matchTypeId = matchTypeId;
    if(this.fishFarmConfig === undefined){
        console.log('========>>>>>>>this.sceneConfig === undefined ');
        return;
    }
    if(global.capture[this.matchTypeId] == undefined){
        console.log('========>>>>>>>global.capture[this.matchTypeId] === undefined ');
        return;
    }
    var Range_Of_Weapon = global.capture[this.matchTypeId]["weapon_index"];
    if(!Range_Of_Weapon){
        console.log('========>>>>>>>Range_Of_Weapon == undefined ');
        return;
    }
    this.computeTrackTime();
    this.fishManager.resetScreensByTracks(this.allFishFarmTrackIds);//重置所有屏幕
    var strWeapons =  Range_Of_Weapon.split('|') || [0];
    var weaponIndex = [];
    var minIndex = strWeapons[0] *1;
    if(strWeapons.length > 1){
        var maxIndex = strWeapons[1] *1;
        for(var i = minIndex; i<= maxIndex; i++){
            weaponIndex.push(i);
        }
    }else{
        weaponIndex.push(minIndex);
    }
    this.weaponList = [];
    //this.weaponList2 = []; /// *xiahou 2016/10/16*
    for (var i = 0; i < weaponIndex.length; i++) {
        this.weaponList.push(global.getWeaponData(weaponIndex[i]).weapon_id);
        //this.weaponList2.push(global.getWeaponData(weaponIndex[i]).multiple);
    }
    this.setPropDropSwitch(global.capture[this.matchTypeId].prop_type);
};
/**
 * 获取所有鱼路径当前时间
 * */
ThemeScene.prototype.getTrackTimeInfo = function (isFishTideState) {
    var result = [];
    /*console.log('---------------------this.allFishFarmTrackIds',this.allFishFarmTrackIds);
    console.log('---------------------this.trackCount',this.trackCount);*/
    for(var aKey in this.allFishFarmTrackIds) {
        var tempTrackIds = this.allFishFarmTrackIds[aKey];
        for (var i = 0; i < tempTrackIds.length; i++) {
            var obj = {};
            obj.trackId = tempTrackIds[i];
            //console.log('++getTrackTimeInfo=>: ',tempTrackIds[i], this.trackCount[aKey][i]);
            obj.time = this.trackCount[aKey][i];
            if(isFishTideState != undefined && isFishTideState == true){
                obj.time = -1;
            }
            if(aKey == global.fishTrackType.FishTide /*&& obj.trackId >= 470 && obj.trackId <= 475*/){
                obj.time = this.trackCount[aKey][i] +1;
            }
            result.push(obj);
        }
    }
    //console.log('---------------------result',result);
    return result;
};

ThemeScene.prototype.getTrackDeadFishInfo = function () {
    var deadFish = [];
    for(var aKey in this.allFishFarmTrackIds){
        var tempTrackIds = this.allFishFarmTrackIds[aKey];
        for (var i = 0; i < tempTrackIds.length; i++) {
            var trackFish = {};
            trackFish.trackId = tempTrackIds[i];
            trackFish.fishIds = this.fishManager.getDeadFishListByTrackId(trackFish.trackId);
            deadFish.push(trackFish);
        }
    }
    return deadFish;
}
/**
 * 固定间隔更新
 * @return {Array} 返回一个更新的path列表
 * */
ThemeScene.prototype.refreshTrackByTime = function () {
    var pathRefresh = [];
    /*console.log('==>trackCount: ',this.trackCount);
    console.log('==>this.trackTime[global.fishTrackType.Normal]: ',this.trackTime[global.fishTrackType.Normal]);*/
    ////普通
    var tempTrackIds = this.allFishFarmTrackIds[global.fishTrackType.Normal];
    tempTrackIds = tempTrackIds != undefined ? tempTrackIds: [];
    for(var i = 0; i < tempTrackIds.length; i++){
        if (++this.trackCount[global.fishTrackType.Normal][i] >= this.trackTime[global.fishTrackType.Normal][i]) {
            //track时间到
            var randomTrackData = this.fishManager.getOneScreenByTrackId(tempTrackIds[i]);
            //console.log('=========================================randomTrackData ',randomTrackData);
            this.trackCount[global.fishTrackType.Normal][i] = -1;
            pathRefresh.push(randomTrackData);
        }
    }
    /// 判断首条(大\小)Boss鱼和特殊鱼
    for(var key in this.trackTimeIsStart) {
        if (this.trackTimeIsStart[key] == undefined || this.trackTimeIsStart[key] <= 0) {
            continue;
        }
        this.trackTimeIsStart[key] -= 1;
        if (this.trackTimeIsStart[key] <= 0) {
            this.trackTimeIsStart[key] = 0;
            var randomTrackData = undefined;
            key = key *1;
            var tempType = -1, tempIndex = -1;
            switch (key){
                case global.fishTrackType.SmallBoss:{
                    tempType = key;
                    tempIndex = this.curSmallBossIndex;
                }break;
                case global.fishTrackType.BigBoss:{
                    tempType = key;
                    tempIndex = this.curBigBossIndex;
                }break;
                case global.fishTrackType.Spweapon:{
                    tempType = key;
                    tempIndex = this.curSpweaponIndex;
                }break;
                default: break;
            }

            if(tempIndex != -1 && tempType != -1){
                tempTrackIds = this.allFishFarmTrackIds[tempType];
                tempTrackIds = tempTrackIds != undefined ? tempTrackIds: [];
                randomTrackData = this.fishManager.getOneScreenByTrackId(tempTrackIds[tempIndex]);
                this.trackCount[tempType][tempIndex] = -1;
                var r = this.fishManager.getScreenCountAndTimeByTrackId(tempTrackIds[tempIndex]);
                this.trackTime[tempType][tempIndex] = r.screen_time * 1;
            }
            if(randomTrackData != undefined) {
                pathRefresh.push(randomTrackData);
            }
        }
    }
    ////小Boss
    tempTrackIds = this.allFishFarmTrackIds[global.fishTrackType.SmallBoss];
    tempTrackIds = tempTrackIds != undefined ? tempTrackIds: [];
    if(tempTrackIds[this.curSmallBossIndex] != undefined && this.trackTimeIsStart[global.fishTrackType.SmallBoss] <= 0){
        //console.log('=++++=>this.curSmallBossIndex: ',this.trackTime[global.fishTrackType.SmallBoss][this.curSmallBossIndex],tempTrackIds[this.curSmallBossIndex]);
        if (++this.trackCount[global.fishTrackType.SmallBoss][this.curSmallBossIndex] >= this.trackTime[global.fishTrackType.SmallBoss][this.curSmallBossIndex]) {
            if(tempTrackIds[this.curSmallBossIndex-1] *1== 440) {
                tempTrackIds[this.curSmallBossIndex-1] = "430";
            }
            if(this.curSmallBossIndex == tempTrackIds.length -1 && tempTrackIds[this.curSmallBossIndex] *1== 440){
                tempTrackIds[this.curSmallBossIndex] = "430";
            }
            this.trackCount[global.fishTrackType.SmallBoss][this.curSmallBossIndex] = -1;

            this.curSmallBossIndex ++;
            var randomTrackData = this.fishManager.getOneScreenByTrackId(tempTrackIds[this.curSmallBossIndex]);
            if(this.curSmallBossIndex > tempTrackIds.length -1){
                this.curSmallBossIndex = 0;

                //打乱顺序
                var l_trackIds = [];
                for(var i=0;i<tempTrackIds.length;i++){
                    l_trackIds.push(tempTrackIds[i])
                }
                this.allFishFarmTrackIds[global.fishTrackType.SmallBoss].sort(function(){ return 0.5 - Math.random() });
                ///上次的最后一个与这次的第一个相同,则换位,
                if(l_trackIds[l_trackIds.length -1] == this.allFishFarmTrackIds[global.fishTrackType.SmallBoss][0] &&
                    this.allFishFarmTrackIds[global.fishTrackType.SmallBoss].length > 1)
                {
                    var No1Index = this.allFishFarmTrackIds[global.fishTrackType.SmallBoss][0];
                    this.allFishFarmTrackIds[global.fishTrackType.SmallBoss][0] = this.allFishFarmTrackIds[global.fishTrackType.SmallBoss][1];
                    this.allFishFarmTrackIds[global.fishTrackType.SmallBoss][1] = No1Index;
                }
                var l_trackIds = this.allFishFarmTrackIds[global.fishTrackType.SmallBoss];
                randomTrackData = this.fishManager.getOneScreenByTrackId(l_trackIds[this.curSmallBossIndex]);
                this.computeTrackTime(global.fishTrackType.SmallBoss);
            }
            if(randomTrackData != undefined) {
                pathRefresh.push(randomTrackData);
            }
        }
    }
    ////大Boss
    tempTrackIds = this.allFishFarmTrackIds[global.fishTrackType.BigBoss] ;
    tempTrackIds = tempTrackIds != undefined ? tempTrackIds: [];
    if(tempTrackIds[this.curBigBossIndex] != undefined && this.trackTimeIsStart[global.fishTrackType.BigBoss] <= 0){
        //console.log('=++++=>this.curBigBossIndex: ',this.trackTime[global.fishTrackType.BigBoss][this.curBigBossIndex]);
        if (++this.trackCount[global.fishTrackType.BigBoss][this.curBigBossIndex] >= this.trackTime[global.fishTrackType.BigBoss][this.curBigBossIndex]) {
            this.trackCount[global.fishTrackType.BigBoss][this.curBigBossIndex] = -1;

            this.curBigBossIndex ++;
            var randomTrackData = this.fishManager.getOneScreenByTrackId(tempTrackIds[this.curBigBossIndex]);

            if(this.curBigBossIndex > tempTrackIds.length -1){
                this.curBigBossIndex = 0;
                //打乱顺序
                var l_trackIds = [];
                for(var i=0;i<tempTrackIds.length;i++){
                    l_trackIds.push(tempTrackIds[i])
                }
                this.allFishFarmTrackIds[global.fishTrackType.BigBoss].sort(function(){ return 0.5 - Math.random() });
                ///上次的最后一个与这次的第一个相同,则换位,
                if(l_trackIds[l_trackIds.length -1] == this.allFishFarmTrackIds[global.fishTrackType.BigBoss][0] &&
                    this.allFishFarmTrackIds[global.fishTrackType.BigBoss].length > 1)
                {
                    var No1Index = this.allFishFarmTrackIds[global.fishTrackType.BigBoss][0];
                    this.allFishFarmTrackIds[global.fishTrackType.BigBoss][0] = this.allFishFarmTrackIds[global.fishTrackType.BigBoss][1];
                    this.allFishFarmTrackIds[global.fishTrackType.BigBoss][1] = No1Index;
                }
                var l_trackIds = this.allFishFarmTrackIds[global.fishTrackType.BigBoss];
                randomTrackData = this.fishManager.getOneScreenByTrackId(tempTrackIds[this.curBigBossIndex]);
                this.computeTrackTime(global.fishTrackType.BigBoss);
            }
            if(randomTrackData != undefined) {
                pathRefresh.push(randomTrackData);
            }
        }
    }

    ////特殊武器鱼
    tempTrackIds = this.allFishFarmTrackIds[global.fishTrackType.Spweapon] ;
    tempTrackIds = tempTrackIds != undefined ? tempTrackIds: [];
    if(tempTrackIds[this.curSpweaponIndex] != undefined && this.trackTimeIsStart[global.fishTrackType.Spweapon] <= 0 && this.closeUpdateTrackCount == false){
        //console.log('=55555=>trackCount: ',this.trackCount[global.fishTrackType.Spweapon][this.curSpweaponIndex],tempTrackIds);
        if (++this.trackCount[global.fishTrackType.Spweapon][this.curSpweaponIndex] >= this.trackTime[global.fishTrackType.Spweapon][this.curSpweaponIndex]) {
            this.trackCount[global.fishTrackType.Spweapon][this.curSpweaponIndex] = -1;

            this.curSpweaponIndex ++;
            var randomTrackData = this.fishManager.getOneScreenByTrackId(tempTrackIds[this.curSpweaponIndex]);

            if(this.curSpweaponIndex > tempTrackIds.length -1){
                this.curSpweaponIndex = 0;
                randomTrackData = this.fishManager.getOneScreenByTrackId(tempTrackIds[this.curSpweaponIndex]);
                /// 无需打乱顺序
                this.computeTrackTime(global.fishTrackType.Spweapon);
            }
            if(randomTrackData != undefined) {
                pathRefresh.push(randomTrackData);
            }
            //console.log('=55555=>spceialWeapon randomTrackData: ', randomTrackData);
        }
    }
    for(var p =0; p < pathRefresh.length; p++)
    {
        if(pathRefresh[p] !== undefined)
            this.getTrackFishValues(pathRefresh[p].trackid);
    }
    return pathRefresh;
};
ThemeScene.prototype.setSpceialWeaponTrackTime = function (isOpen) {
    if(isOpen != undefined){
        this.closeUpdateTrackCount = isOpen;
        if(isOpen == false){
            var tempCount = this.trackCount[global.fishTrackType.Spweapon][this.curSpweaponIndex];
            this.trackTime[global.fishTrackType.Spweapon][this.curSpweaponIndex] = tempCount+5;
        }
    }
}
/***
 * 鱼潮时间固定间隔更新
 * @returns {boolean}
 */
ThemeScene.prototype.refreshTrackByTimeByFishType = function (fishType){
    var tempTrackIds = this.allFishFarmTrackIds[fishType];
    tempTrackIds = tempTrackIds != undefined ? tempTrackIds: [];
    var isEnd =false;
    /*console.log('--------------------------this.trackCount2 ', this.trackCount);
    console.log('--------------------------this.trackTime ', this.trackTime);*/
    for(var i = 0; i < tempTrackIds.length; i++) {
        //console.log('==refreshTrackByTimeByFishType==>: ',this.trackCount[fishType][i] ,this.trackTime[fishType][i]);
        if (this.trackCount[fishType][i]++ >= this.trackTime[fishType][i] -1) {
            isEnd = true;
            this.trackCount[fishType][i] = -1;
            break;
        }
    }
    return isEnd;
}
/**
 *
 * @param roomType /// 不同场次下的房间类别(1\经典赛 2\快速赛 3\大奖赛)
 * @param fishes /// 鱼死亡列表
 * @param weapon /// 武器信息
 * @param isFullCapture /// 是否全屏捕获
 * @param explosionQiLin /// 碰撞麒麟鱼的次数
 * @param bombValue /// 捕获炸弹鱼后鱼的价值
 * @param boxPropRate /// 宝箱物品掉落系数
 * @param tempCoefficient /// 捕获鱼的系数
 * @returns {{deadFish: Array, drop: {}, score: number, integral: number, gold: number, explosionQiLin: number}}
 */
ThemeScene.prototype.capture = function (roomType, fishes, weapon, isFullCapture, explosionQiLin, bombValue, boxPropRate, tempCoefficient, finalExplode) {
    // 基础系数
    var basicscoefficient = global.capture[this.matchTypeId].basics_coefficient*1 || 0;
    if(tempCoefficient == undefined){
        tempCoefficient = 0;
    }
    tempCoefficient += basicscoefficient;
    var deadFishes = [];
    var dropData = {};
    var resultInfo = {deadFish:[], drop:{}, score:0, integral:0, gold:0, explosionQiLin: 0};

    var fishManager = this.fishManager;
    var self = this;
    ///---------------- 特殊武器鱼的处理 ------------START
    var totalWeight = 0;
    var surplusEnergy = 1;
    if(finalExplode != undefined && finalExplode == 1){
        for (var i = 0; i < fishes.length; i++) {
            var fishId = fishes[i];
            if (fishManager.isFishDead(fishId))continue;//死了就跳过

            var type = fishManager.getFishTypeById(fishId);
            //根据类型获取鱼的基础配置信息
            var fish = global.getFishInfoByIndex(type);
            if (!fish) {
                continue;
            }
            totalWeight += fish.weight *1;
        }
        surplusEnergy = (global.specialInfo.ztp_residual_energy*1 ) * self.totalWeaponEnergy;
        if(self.weaponFishEnergy <= surplusEnergy){
            surplusEnergy = self.weaponFishEnergy;
        }
        self.totalWeaponEnergy = 0; /// 爆炸后清零
    }
    ///---------------- 特殊武器鱼的处理 ------------END
    for (var i = 0; i < fishes.length; i++) {
        var fishId = fishes[i];
        if (fishManager.isFishDead(fishId))continue;//死了就跳过

        var type = fishManager.getFishTypeById(fishId);
        //根据类型获取鱼的基础配置信息
        var fish = global.getFishInfoByIndex(type);
        if (!fish) {
            logger.debug('no fish data, fish id is ' + fishId + '| type is ' + type);
            continue;
        }

        var fishValue = this.allTrackFishValues[type];
        if(fishValue == undefined || fishValue < 0){
            fishValue = fish.value_low *1;
        }
        //// 判断是不是麒麟鱼
        if(fish.name == "qilin"  && fish.value_type == 3){
            explosionQiLin = 1 + explosionQiLin *1|| 0;
            if(explosionQiLin >= fish.value_high *1 - fish.value_low *1){
                explosionQiLin = fish.value_high *1 - fish.value_low *1;
            }
            fishValue = explosionQiLin + fish.value_low *1;
        }
        //// 判断是不是炸弹bomb鱼 *暂时的处理方式*
        if(fish.name == "bomb" && fish.value_type == 1){
            fishValue = bombValue || fish.value_low *1;  /// 用于计算捕获的价值
        }
        // 现行方案
        var l_coefficient = this.skillCoefficient || 1;
        var p = (tempCoefficient / fishValue) * 100 * l_coefficient;
        var r = commons.INRANGE_RANDOM_FLOAT(0,100);

        /// 是否是全屏捕获
        if((isFullCapture != undefined && isFullCapture > 0)){
            p = r + 10;  /// 只要p大于r就行
        }

        ///---------------- 特殊武器鱼的处理 ------------START
        if(finalExplode != undefined){
            if(finalExplode == 0){
                p = (fish.ztp_threshold *1) * p;
                //console.log("--isFinalExplode---0-==>> fishEnergy: ",self.weaponFishEnergy,fish.ztp_threshold,p,r);
                self.weaponFishEnergy -= fish.ztp_threshold *1;  ///每次碰撞能量就减少ztp_threshold
                if(self.weaponFishEnergy < 0)
                    self.weaponFishEnergy = 0;
            }
            else if(finalExplode == 1){
                /// (鱼的权值 / 总共鱼的权值) * 剩余武器能量 * 自身捕获率
                p = (fish.weight *1 / totalWeight) * surplusEnergy *p;
                //console.log("--isFinalExplode--1-==>> Energy: %s, totalWeight: %s, \n weight: %s, p: %s, r: %s",surplusEnergy, totalWeight, fish.weight, p, r);
            }
        }
        ///---------------- 特殊武器鱼的处理 ------------END
        //console.log("-------isFullCapture = ",isFullCapture, r, p, basicscoefficient,tempCoefficient,fishValue, fish.name);
        if (r > p){ //没捕获
            continue;
        }
        //// 判断是不是炸弹bomb鱼
        if(fish.name == "bomb" && fish.value_type == 1){
            fishValue = fish.value_low *1;  /// 捕获后的价值
        }
        //var room_tpye = this.fishFarmConfig.Type;
        var delFish = function(fishId, fishInfo, fish_value){
            //捕获成功w
            //将死鱼记录 计算掉落
            fishManager.setFishIsDead(fishId);
            dropData[fishId] = {};
            if(fish_value == undefined){
                fish_value = fishInfo.value_low *1;
            }
            /// roomType = 1: 经典赛 2: 快速赛 3: 大奖赛
            var dFishData = {fishId:fishId, gold: 0, experience: 0};
            if (roomType == 1) {
                var normalDrop = self.getNormalDrop({gold: fish_value}, weapon);
                dFishData.gold = normalDrop.gold;
                dFishData.experience = fish_value;
            }
            else if(roomType == 2){
                var competitionDrop = self.getCompetitionDrop({gold: fish_value}, weapon);
                resultInfo.score += competitionDrop;
                dFishData.gold = competitionDrop;
            }
            else if(roomType == 3){
                var temp = self.getBigMatchDrop({gold: fish_value}, weapon);
                resultInfo.integral += temp.integral;
                dFishData.gold = temp.gold;
                dFishData.experience = fish_value;
            }
            //// 判断是不是炸弹bomb鱼或特殊武器鱼(钻头炮|激光炮..)
            if((fishInfo.name == "bomb" && fishInfo.value_type == 1) || fishInfo.fish_type == 4){
                dFishData.gold = 0;  ///炸弹鱼或特殊武器鱼死亡不掉落金币
                dFishData.experience = 0; ///炸弹鱼或特殊武器鱼死亡不增加经验
                if(fishInfo.fish_type == 4){
                    self.weaponFishEnergy = fish_value * (global.specialInfo.ztp_coefficient*1); /// 鱼的总能量
                    self.totalWeaponEnergy = fish_value * (global.specialInfo.ztp_coefficient*1); /// 鱼的总能量
                }
            }
            deadFishes.push(dFishData);
            /// 是否掉落物品
            var resPropList = [];
            if(fishInfo.prop_id != undefined && fishInfo.prop_num != undefined && fishInfo.prop_rate != undefined) {
                var tempId = fishInfo.prop_id.split('|');
                var tempNum = fishInfo.prop_num.split('|');
                var tempRate = fishInfo.prop_rate.split('|');
                if (tempId.length == tempNum.length && tempNum.length == tempRate.length) {
                    for (var i = 0; i < tempNum.length; i++) {
                        if (tempId[i] == undefined || tempNum[i] == undefined || tempId[i] <= 0 || tempNum[i] <= 0) {
                            continue;
                        }
                        if(global.prop[tempId[i]] == undefined || self.dropPropTypes.indexOf(tempId[i] *1) < 0){
                            console.log('==>global.prop[tempId[i]] == undefined <==', tempId[i], self.dropPropTypes);
                            continue;
                        }
                        var l_tempRate = tempRate[i] *1 * 100;
                        if(tempId[i] == 1401 && boxPropRate != undefined){
                            l_tempRate += boxPropRate *1 * 100;  /// 只有是青铜宝箱才加额外系数
                        }

                        /// 不掉落宝箱 *临时方案 2016/12/29*
                        if(tempId[i] == 1401 || tempId[i] == 1402 || tempId[i] == 1403){
                            continue;
                        }
                        var randRate = commons.INRANGE_RANDOM_FLOAT(0, 100);
                        if (randRate <= l_tempRate) {
                            resPropList.push({id: tempId[i] *1, type: global.prop[tempId[i]].exchange_type, num: tempNum[i] *1});
                        }
                        /*var resNum = commons.propDrop(tempNum[i], tempRate[i]);
                        if (resNum > 0) {
                            resPropList.push({id: tempId[i], type: 1, num: resNum});
                        }*/
                    }
                }
            }
            if(resPropList != null && resPropList.length > 0){
                /// 掉落成功
                dropData[fishId].propList = resPropList;
            }
            /// 是否掉落钻石
            var randDiamond = commons.INRANGE_RANDOM_FLOAT(0,100);
            if(fishInfo.diamond_rate != undefined && fishInfo.diamond_rate *1 > 0 && randDiamond <= fishInfo.diamond_rate *1*100){
                dropData[fishId].gemNum = fishInfo.diamond_num *1 || 0;
            }
        }
        //add by jason 打死一波 special_type
        var fishMap = fishManager.fishIdMap;
        var special_type = fishMap[fishId].special_type;
        var l_waveid = fishMap[fishId].waveid;
        if(special_type ==  0){
            delFish(fishId, fish, fishValue);
            continue;
        }

        //打死所有指定的类型的鱼
        for(var k in fishMap){
            var obj = fishMap[k];
            if (obj && obj.special_type == special_type && obj.waveid == l_waveid ){
                //根据类型获取鱼的基础配置信息
                var l_fish = global.getFishInfoByIndex(obj.type);
                if (!l_fish) {
                    console.log('1111===>no fish data, fish id is ' + fishId + '| type is ' + obj.type);
                    continue;
                }
                //console.log('-------special_type == dapanyu------->> obj: ', obj);
                delFish(obj.fishId, l_fish);
            }
        }
    }
    resultInfo.deadFish = deadFishes;
    resultInfo.drop = dropData;
    resultInfo.explosionQiLin = explosionQiLin || 0;
    //console.log('-------------->> resultInfo: ',JSON.stringify(resultInfo));
    return resultInfo;
    /*return {
        deadFish: deadFishes,
        drop: dropData
    };*/
};

ThemeScene.prototype.setSkillCoefficient= function (coefficient){
    this.skillCoefficient = coefficient || 1;
}
/**
 * 检测武器的合法性
 * @param weapon{int} 武器索引
 * @return {boolean}是否合法
 * */
ThemeScene.prototype.checkWeaponLegal = function (weapon) {
    //console.log(weapon);
    //logger.debug(weapon);
    for (var i = 0; i < this.weaponList.length; i++) {
        if (weapon == this.weaponList[i])return true;
    }
    return false;
};

/**
 * 生成随机掉落
 * 目前仅有必掉的金币
 * */
ThemeScene.prototype.getNormalDrop = function (fishInfo, weapon) {
    //console.log(JSON.stringify(fishInfo));
    return {gold: fishInfo.gold * weapon.multiple};
};

/**
 * 竞赛模式中获取掉落(比赛积分)信息
 * TODO 可能会有更复杂的逻辑
 * */
ThemeScene.prototype.getCompetitionDrop = function (fishInfo, multiple) {
    return fishInfo.gold * multiple;
};
/**
 * 大奖模式中获取掉落(比赛积分)信息
 *
 * */
ThemeScene.prototype.getBigMatchDrop = function (fishInfo, weapon) {
    return {gold: fishInfo.gold * weapon.multiple, integral: fishInfo.gold};
};
/**
 * 在所有人离开房间之后释放这个Scene
 * 清除所有计时器
 * 释放存放的数据
 * */
ThemeScene.prototype.release = function () {
    clearInterval(this.siteInterval);
};

//返回所有track当前运行时间
ThemeScene.prototype.getCurrentTrackTime = function (isFistUpdate) {
    var result = [];
    for(var aKey in this.allFishFarmTrackIds) {
        var tempTrackIds = this.allFishFarmTrackIds[aKey];
        for (var i = 0; i < tempTrackIds.length; i++) {
            var obj = {};
            obj.trackId = tempTrackIds[i];
            obj.time = this.trackCount[aKey][i];
            if(isFistUpdate != undefined && isFistUpdate == true){
                obj.time = 1;
                if(aKey == global.fishTrackType.SmallBoss|| aKey == global.fishTrackType.BigBoss || aKey == global.fishTrackType.Spweapon) {
                    obj.time = -1;
                }
            }

            if(aKey == global.fishTrackType.FishTide){
                obj.time = this.trackCount[aKey][i] +1;
            }
            result.push(obj);
        }
    }
    //console.log('=15151515=getCurrentTrackTime===>result: ', JSON.stringify(result));
    return result;
};

/**
 * 获取捕获系数
 * 除基本公式外的所有因素 系数
 * @param site{int}玩家位置 位置系数
 * */
ThemeScene.prototype.getCaptureCoefficient = function (site) {
    var coefficient = 1;
    if (this.fishFarmConfig.baseCoefficient) {
        coefficient *= this.baseCoefficient;
    }
};

/**
 * 获取捕获系数
 * 除基本公式外的所有因素 系数
 * @param site{int}玩家位置 位置系数
 * */
ThemeScene.prototype.setPropDropSwitch = function (dropTypes) {
    if(dropTypes == undefined){
        return;
    }
    var l_dropType = dropTypes.split("|");
    for(var i =0; i< l_dropType.length; i++){
        if(l_dropType == undefined){
            continue;
        }
        this.dropPropTypes.push(l_dropType[i] *1);
    }
};