/**
 * Created by 李峥 on 2016/3/30.
 * 鱼的管理类
 * 插于room对象中 每个room一个
 */

var DepthManager = require('./DepthManager.js');
var _underscore = require('underscore');
var logger = require("./logHelper").helper;

module.exports = function (trackIds) {
    return new FishManager(trackIds);
};

var log = function(s) {
    //console.log(s);
}
function FishManager(trackIds) {
    this.trackIds = trackIds;//所包含的所有trackId
    this.depthManager = DepthManager();

    this.pathdata = global.getAllTracks();
    this.fishIdMap = global.getFishMap();
    this.fishDeepMap = global.getFishDepth();
    this.deadFishes = {};

    this.randomPathInfos = {};
    this.randomPathInfos.tracks = [];
    this.fishWavePathInfos = {};
    this.fishWavePathInfos.tracks = [];
    this.trackScreenIndex = {};  /// 每个路径的每屏鱼索引
}

//返回随机后的鱼路径信息
FishManager.prototype.getRandomPathInfos = function () {
    var tempPathInfos = {tracks:[]};
    //console.log('=++getRandomPathInfos++=>trackScreenIndex: ',this.trackScreenIndex);
    //console.log('------------------this.randomPathInfos.tracks ',this.randomPathInfos.tracks);
    for(var i = 0; i <this.randomPathInfos.tracks.length; i++){
        var tempTrack = this.randomPathInfos.tracks[i];  ///每个track信息
        var index = this.trackScreenIndex[tempTrack.trackid];
        if(index == undefined){ index = 0; }
        //console.log('------------------tempTrack.screens ',tempTrack.screens);
        //console.log('------------------tempTrack.screens[index] ',tempTrack.screens[index]); //{ screenid: '3', waves: [ { deep: 896 }, { deep: 960 } ] }
        tempPathInfos.tracks.push({trackid:tempTrack.trackid, screens: [tempTrack.screens[index]]});
    }

    return tempPathInfos;
    //return this.randomPathInfos;
};

//返回鱼的类型ID
FishManager.prototype.getFishTypeById = function (fishId) {
    if (this.fishIdMap[fishId]) {
        return this.fishIdMap[fishId].type;
    }
};

//标记鱼死亡状态
FishManager.prototype.setFishIsDead = function (fishId) {
    if (this.fishIdMap[fishId]) {
        this.fishIdMap[fishId].isdead = true;
        this.deadFishes[fishId] = true;
    }
};

//重置所有鱼的死亡状态为未死亡
FishManager.prototype.resetFishAliveByTrackId = function (trackId) {
    for (var fishId in this.fishIdMap) {
        if (this.fishIdMap[fishId].trackId == trackId) {
            this.fishIdMap[fishId].isdead = false;
            delete this.deadFishes[fishId];
        }
    }
};

//根据trackId获得死亡鱼的ID
FishManager.prototype.getDeadFishListByTrackId = function (trackId) {
    var deadfish = [];

    for (var fishId in this.fishIdMap) {
        if (this.fishIdMap[fishId].isdead && this.fishIdMap[fishId].trackId == trackId) {
            deadfish.push(fishId);
        }
    }
    return deadfish;
};

/**
 * 根据fishId判断鱼是否死亡
 * @param fishId{string|int} 要判断的鱼的id
 * @return {boolean} 鱼是否已经死亡
 * */
FishManager.prototype.isFishDead = function (fishId) {
    return this.deadFishes[fishId] || false;
};

//返回所有死亡鱼
FishManager.prototype.getAllDeadFishList = function () {
    var deadfish = [];
    for (var fish in this.fishIdMap) {
        if (this.fishIdMap[fish].isdead) {
            deadfish.push(fish);
        }
    }
    return deadfish;
};

//随机track里的screen顺序
FishManager.prototype.setRandomScreensByTrackId = function (trackId, oldScreens) {
    var randomScreens = [];
    //this.recycleDepthByTrackId(trackId);
    var tempTrack = {trackid: trackId, screens: randomScreens};
    var isBigBossFishInfo = false;
    var screens = [];
    //console.log('-------------------this.pathdata' ,this.pathdata);
    for (var track in this.pathdata) {
        if (this.pathdata[track].track_id == trackId) {
            screens = this.pathdata[track].screens;
            isBigBossFishInfo = this.getIsFishTypeOfFishInfo(this.pathdata[track], 3);  //是否是火龙、雷龙、螃蟹等大boss
        }
    }
    var arr = [];
    for (var i = 0; i < screens.count; i++) {  //nodejs会把screens.count强转为数字,所以不影响
        arr[i] = i;
    }
    arr.sort(function () {
        return 0.5 - Math.random();  //乱序排列
    });
    /// 上次的最后一个与这次的第一个相同,则换位
    if(oldScreens != undefined && oldScreens.length > 1){
        if(oldScreens[oldScreens.length -1].screenid == arr[0]){
            var No1Index = arr[0];
            arr[0] = arr[1];
            arr[1] = No1Index;
        }
    }
    var s = screens.screen;
    //console.log('-------------------sssssssssss' ,s);
    for (var i = 0; i < arr.length; ++i) {
        var screenInfo = {};
        var objscene;

        if(typeof (s[arr[i]]) == "undefined"){
            objscene = s;
           // log("-- i = "+ i+" arr = "+ JSON.stringify(s[arr[i]]));
        }else{
            objscene = s[arr[i]];
        }

        screenInfo.screenid = objscene.name.substring(6);
        var waves = [];
        if(!_underscore.isArray(objscene.wave)){
            objscene.wave = [objscene.wave];
        }
        //console.log('-------------------objscene.wave' ,objscene.wave);
        for (var w in objscene.wave) {
            //console.log('-------------------wwwwwwwwwwwwwww' ,w);
            var wave = {};
            //console.log('wave deep = ' + wave.deep, ' ==>w = ' + w);
            if(isBigBossFishInfo == true){
                /// As long as it is big boss deep set the maximum
                wave.deep = this.depthManager.grid * this.depthManager.grid;
                if(trackId == 462 && w *1 == 0){
                    wave.deep = 0; /// trackID为462(螃蟹)时,wave1的deep为0
                }
            }
            else{
                wave.deep = this.depthManager.getDepth();
                if(wave.deep <= 100){
                    wave.deep = this.depthManager.grid *2; /// 最小deep值为depthManager.grid(64)
                }
            }
            waves.push(wave);
            this.setFishDepth(trackId, w, wave.deep);
        }
        screenInfo.waves = waves;
        randomScreens.push(screenInfo);
    }
    //console.log("---------+++++++++++++++++++-------------this.randomPathInfos",this.randomPathInfos);
    var isFind = false;
    for (var info in this.randomPathInfos.tracks) {
        if (this.randomPathInfos.tracks[info].trackid == trackId) {
            this.randomPathInfos.tracks[info].screens = randomScreens;
            isFind = true;
        }
    }
    if (!isFind) {
        var trackInfo = {};
        trackInfo.trackid = trackId;
        trackInfo.screens = randomScreens;
        this.randomPathInfos.tracks.push(trackInfo);
    }
    this.resetFishAliveByTrackId(trackId);
    return tempTrack;
};

FishManager.prototype.getIsFishTypeOfFishInfo = function(trackInfo, fishType){
    //console.log("------------------->>>>>>>>trackInfo",trackInfo);
    if(trackInfo == undefined || fishType == undefined){
        return false;
    }
    var t_waves = trackInfo.waves;
    if(!_underscore.isArray(t_waves.wave)){
        t_waves.wave = [t_waves.wave];
    }
    var tempPath = [];
    for(var w = 0; w < t_waves.wave.length; w++) {
        tempPath = t_waves.wave[w].path;
        if (tempPath != undefined && !_underscore.isArray(tempPath)) {
            tempPath = [tempPath];
            break;
        }
    }
    if(tempPath.length > 0) {
        var fish = global.getFishInfoByIndex(tempPath[0].fish_type);
        if (fish != undefined && fish.fish_type == fishType) {
            return true;
        }
    }
    return false;
}
//返回所有的screens
FishManager.prototype.getRandomScreensByTrackId = function (trackId) {
    return this.setRandomScreensByTrackId(trackId) || {};
};
/// 返回单个screen信息
FishManager.prototype.getOneScreenByTrackId = function (trackId, appointScreenId) {
    if(trackId == undefined){
        return {};
    }

    if(this.trackScreenIndex[trackId] == undefined){
        return {};
    }
    //this.trackScreenIndex[trackId] { '99': 0 }
    //this.randomPathInfos.tracks [ { trackid: 99,screens: [ [Object], [Object], [Object], [Object] ] } ]
    var tempPathInfos = {};
    /*console.log('-------------------------this.randomPathInfos ',this.randomPathInfos);
    console.log('-------------------------this.randomPathInfos.tracks[0].screens ',this.randomPathInfos.tracks[0].screens);*/
    for(var i = 0; i <this.randomPathInfos.tracks.length; i++){
        var tempTrack = this.randomPathInfos.tracks[i];  ///每个track信息
        if(tempTrack.trackid == trackId) {
            var index = this.trackScreenIndex[tempTrack.trackid];
            if(index == undefined){ index = 0; }
            index += 1;  ///每次获取累加 +1 index=index+1

            if(appointScreenId != undefined){  /// 用于新手引导指定ScreenId
                if (appointScreenId *1 > tempTrack.screens.length - 1) {
                    appointScreenId = 0;
                }
                var tempScreen = {};
                for(var s = 0; s < tempTrack.screens.length; s++){
                    if(tempTrack.screens[s].screenid *1 == appointScreenId){
                        tempScreen = tempTrack.screens[s];break;
                    }
                }
                tempPathInfos = {trackid: tempTrack.trackid, screens: [tempScreen]};
            }else {

                if(tempTrack.screens.length <= 2){
                    /// 当总屏数小于2时,下标index不是0就是1
                    if (index > tempTrack.screens.length - 1) {
                        index = 0;
                    }
                    tempPathInfos = {trackid: tempTrack.trackid, screens: [tempTrack.screens[index]]};
                    this.trackScreenIndex[tempTrack.trackid] = index;
                    this.resetFishAliveByTrackId(tempTrack.trackid);  ///切屏时把该路径下死鱼列表清除
                }else {
                    if (index > tempTrack.screens.length - 1) {
                        var newScreenInfo = this.setRandomScreensByTrackId(tempTrack.trackid, tempTrack.screens) || {};
                        index = 0;
                        tempPathInfos = {trackid: newScreenInfo.trackid, screens: [newScreenInfo.screens[index]]};
                        this.trackScreenIndex[newScreenInfo.trackid] = index;
                    } else {
                        tempPathInfos = {trackid: tempTrack.trackid, screens: [tempTrack.screens[index]]};
                        this.trackScreenIndex[tempTrack.trackid] = index;
                        this.resetFishAliveByTrackId(tempTrack.trackid);  ///切屏时把该路径下死鱼列表清除
                    }
                }
            }
        }
    }
    return tempPathInfos;
};

FishManager.prototype.resetScreensByTracks = function (allTrackIds) {
    //console.log('---------------------FishManager resetScreensByTracks allTrackIds',allTrackIds);
    this.randomPathInfos = {};
    this.randomPathInfos.tracks = [];
    for(var aKey in allTrackIds) {
        var trackIds = allTrackIds[aKey];
        var tLength = trackIds.length;
       // if(global.fishTrackType.SmallBoss == aKey || global.fishTrackType.BigBoss == aKey){
       //     continue;
       // }
        for (var i = 0; i < tLength; ++i) {
            //console.log('---------------------FishManager trackIds[i] ',trackIds[i]);
            this.setRandomScreensByTrackId(trackIds[i]);
            this.trackScreenIndex[trackIds[i]] = 0;
        }
    }
    return this.randomPathInfos;
};

//返回屏数以及时间
FishManager.prototype.getScreenCountAndTimeByTrackId = function (trackId) {
    var result = {};
    var resultTrack = {};
    for (var track in this.pathdata) {
        if (this.pathdata[track].track_id == trackId) {
            resultTrack = this.pathdata[track];
        }
    }
//console.log('-1111111111--trackId->: ',trackId, resultTrack);
    result.track_id = resultTrack.track_id;
    result.screen_time = resultTrack.screen_time;
    result.screen_count = resultTrack.screens.count;

    if(global.getTrackTypeByTrackId(result.track_id) == global.fishTrackType.FishTide){
        /// 鱼潮路径
        return result;
    }
    else {
        //// 找其中一个就可以
        if (!_underscore.isArray(resultTrack.waves.wave)) {
            resultTrack.waves.wave = [resultTrack.waves.wave];
        }
        var tPath = resultTrack.waves.wave[0].path;
        if (!_underscore.isArray(tPath)) {
            tPath = [tPath];
        }
        //// 判断是否是大盘鱼
        if (tPath[0].fish_special_type != undefined && tPath[0].fish_special_type * 1 > 0) {
            var gBigFish = global.bigfish[tPath[0].fish_special_type * 1];
            if (gBigFish != undefined && gBigFish.refreshLowerLimit * 1 > 0 && gBigFish.refreshUpperLimit * 1 > 0) {
                result.screen_time = _underscore.random(gBigFish.refreshLowerLimit * 1, gBigFish.refreshUpperLimit * 1);
                //console.log('=DaPanYu====>screen_time，trackId : ', result.screen_time,trackId);
            }
        } else {
            var fishInfo = global.getFishInfoByIndex(tPath[0].fish_type);
            //// 判断是否是Boss类型
            if (fishInfo.fish_type > global.fishTrackType.Normal && fishInfo.refreshLowerLimit * 1 > 0 && fishInfo.refreshUpperLimit * 1 > 0) {
                result.screen_time = _underscore.random(fishInfo.refreshLowerLimit * 1, fishInfo.refreshUpperLimit * 1);
                //console.log('==BossFish===>screen_time，trackId : ', result.screen_time, trackId);
            }
        }
        return result;
    }
};


//设置鱼潮随机screen
FishManager.prototype.setFishWaveScreensByTrackId = function (trackId) {
    this.recycleDepthByTrackId(trackId);
    var randomScreens = [];
    var screens = [];
    for (var track in this.pathdata) {
        if (this.pathdata[track].track_id == trackId) {
            screens = this.pathdata[track].screens;
        }
    }

    for (var i in screens) {
        var screenInfo = {};
        screenInfo.screenid = screens[i].name.substring(6);
        var waves = [];

        for (var w in screens[i].waves) {
            var wave = {};
            wave.deep = this.depthManager.getDepth();
            waves.push(wave);
            this.setFishDepth(trackId, w, wave.deep);
        }
        screenInfo.waves = waves;
        randomScreens.push(screenInfo);
    }

    var isFind = false;
    for (var info in this.fishWavePathInfos.tracks) {
        if (this.fishWavePathInfos.tracks[info].trackid == trackId) {
            this.fishWavePathInfos.tracks[info].screens = randomScreens;
            isFind = true;
        }
    }
    if (!isFind) {
        var trackInfo = {};
        trackInfo.trackid = trackId;
        trackInfo.screens = randomScreens;
        this.fishWavePathInfos.tracks.push(trackInfo);
    }

    this.resetFishAliveByTrackId(trackId);
};

FishManager.prototype.resetFishWaveScreensByTracks = function (trackIds) {
    var result = [];
    for (var i = 0; i < trackIds.length; ++i) {
        result.push(this.setFishWaveScreensByTrackId(trackIds[i]));
    }
    return result;
};

FishManager.prototype.getTrackTimeByTrackId = function (trackId) {
    var randomScreens = [];
    var screenCount = 0;
    var screenTime = 0;
    for (var track in this.pathdata) {
        if (this.pathdata[track].track_id == trackId) {
            screenCount = parseInt(this.pathdata[track].screens.count);
            screenTime = parseInt(this.pathdata[track].screen_time);
        }
    }
    return screenCount * screenTime;
};

FishManager.prototype.setFishDepth = function (trackId, waveId, deep) {
    for (var i in this.fishIdMap) {
        var fish = this.fishIdMap[i];
        if (fish.trackid == trackId && fish.waveid == waveId) {
            this.fishDeepMap[i].deep = deep;
        }
    }
};

//回收鱼的深度
FishManager.prototype.recycleDepth = function (fishId) {
    var deep = this.fishDeepMap[fishId].deep;
    this.depthManager.recycleDepth(deep);
    this.fishDeepMap[fishId].deep = -1;
};

FishManager.prototype.recycleDepthByTrackId = function (trackId) {
    for (var i in this.fishIdMap) {
        var fish = this.fishIdMap[i];
        if (fish.trackid == trackId && this.fishDeepMap[i].deep != -1) {
            this.recycleDepth(fish.fishId);
            //this.depthManager.recycleDepth(this.fishDeepMap[i].deep);
        }
    }
};