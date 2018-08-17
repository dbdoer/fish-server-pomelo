"use strict";
/**
 * config加载器
 * 将配置以getXXX的形式添加到global中
 */

var fs = require("fs");
var pathInfo = require('./pathInfo.js');
var PATH_DIR = __dirname ;

var compconfig = require("./compconfig.json");//id对应文件名
var compreward = require("./compraward.json");//id对应文件名
var capture = require("./capture.json");//id对应文件名
var bonus = require("./bonus.json");//id对应文件名
var Subsidy = require("./Subsidy.json");//id对应文件名
var mail = require("./mail.json");//id对应文件名
var bigfish = require('./bigfish.json');
var skillInfo = require("./skill.json");
var skinInfo = require("./skin.json");//皮肤
var tracksIndex = require("./track.json");//id对应文件名
var sceneConfigs = require("./scene.json").fishfarm;//scene
var fishInfo = require('./fish.json');
var levelInfo = require('./level.json');
var other = require('./other.json');
var notice = require('./notice.json');
var propInfo = require('./prop.json');
var vipInfo = require('./vip.json');
var vipInfo_En = require('./English/vip.json');
var guideInfo = require('./guide.json');
var specialInfo = require('./special.json');
var computeSign = function () {
    var nowDate = new Date();
    var dateY = nowDate.getFullYear();
    var dateM = nowDate.getMonth() +1;
    var dateD = nowDate.getDate();
    var dateH = nowDate.getHours();
    if(dateD == 1 && dateH < 5){
        if(dateM == 1){
            dateY = dateY -1;
        }
        dateM = dateM -1;
        if(dateM <= 0){
            dateM = 12;
        }
    }
    var nextY = dateY;
    var nextMonth = dateM + 1;
    if(nextMonth > 12){
        nextY += 1;
        nextMonth = 1;
    }
    var nextDate = new Date(nextY + "-" + nextMonth + "-1" + " 05:00:00");
    var temp_time = nextDate.getTime() - nowDate.getTime();
    if(temp_time > 15 * 24 * 60 * 60 * 1000){ /// temp_time max number = 2 ^31 -1
        temp_time = 15 * 24 * 60 * 60 * 1000;
    }
    var tempSignTimeOut = setTimeout(function () {
        var tempName = computeSign();
        global.signInfo = require('./sign'+tempName+'.json');
        global.totalSignInfo = require('./signTotalReward'+tempName+'.json');
    }, temp_time);
    return dateY +""+ dateM;
}
var strFileName = computeSign();
var files = fs.readdirSync(PATH_DIR);
//console.log("------------------files" ,files);
var isSignFileName = null;
var isSignTotalFileName = null;
for(var key=0; key < files.length ; key++){
    if(files[key] == ('sign'+strFileName+'.json')){
        isSignFileName = true;
        break;
    }
}
for(var key=0; key < files.length ; key++){
    if(files[key] == ('signTotalReward'+strFileName+'.json')){
        isSignTotalFileName = true;
        break;
    }
}

if(isSignFileName == null || isSignTotalFileName == null){
    strFileName = '20173';
}
//console.log("------------------strFileName" ,strFileName);
var signInfo = require('./sign'+strFileName+'.json');
var totalSignInfo = require('./signTotalReward'+strFileName+'.json');
var serverID = require('./../conf/config.json').ServerID;

var fishIdTable = {};//id index 映射表

var redis = require("../database/redis").getCluster();
var REDIS_NOTICE_LINK = "fish4NoticeLink:";
var dateNow = new Date();
var getNoticeTime = JSON.stringify(dateNow.getFullYear())+JSON.stringify(dateNow.getMonth()+1)+JSON.stringify(dateNow.getDate());
var noticeInfo = [];

for(var key in fishInfo){
    fishIdTable[fishInfo[key].id] = key;
}
/*for (var i = 0; i < fishInfo.length; i++) {
    fishIdTable[fishInfo[i].id] = i;
}*/
var fishInfo2 = {};
for(var key in fishInfo){
    fishInfo2[key] = fishInfo[key];
}
/*for (var i = 0; i < fishInfo.length; i++) {
    fishInfo2[fishInfo[i].index] = fishInfo[i];
}*/

var weaponData = require('./weapon.json');//武器数据(炮倍)

var matchTable = require('./MatchTable.json');
var fishFarmConfigs = require("./fishfarm.json"); /// 用于主题场景
var arrScene = [];
for (var i in sceneConfigs) {
    if (sceneConfigs[i].Type == 2) {
        arrScene.push(parseInt(sceneConfigs[i].FishFarm_ID));
    }
}

module.exports = (function () {
    //console.log('load config getter');
    global.fishTrackType ={
        Normal : 1,
        SmallBoss : 2,
        BigBoss : 3,
        FishTide : 4,
        Spweapon : 5
    };
    global.guideStepDetail ={
        SharkDead : 1,  ///鲨鱼死亡
        TaskFishDead : 2,  ///任务鱼死亡
        HuoLongDead : 3,  ///火龙死亡
        BombFishDead : 4,  ///炸弹鱼死亡
        RewardGiftbag : 5,  ///3 新手礼包发放
        GuideEnd : 6  ///引导结束
    };

    global.serverID = serverID;
    global.validSceneIds = arrScene;
    global.matchTable = matchTable;
    global.compConfig = compconfig;
    global.capture = capture;
    global.bigfish = bigfish;
    global.bonus = bonus;
    global.subsidy = Subsidy;
    global.mail = mail;
    global.skill = skillInfo;
    global.skin = skinInfo;
    global.other = other;
    global.notice = notice;
    global.prop = propInfo;
    global.vip = vipInfo;
    global.vip_En = vipInfo_En;
    global.levelInfo = levelInfo;
    global.guideInfo = guideInfo["0"];
    global.specialInfo = specialInfo["1"];
    global.signInfo = signInfo;
    global.totalSignInfo = totalSignInfo;
    global.signDataIsChange = 1;  /// 关于签到的相关数据是否变化
    global.getSkinIdByAct = function(actVipLv){
        var skinId = [];
        for (var key in skinInfo) {
            if(skinInfo[key].unlock_act *1 <= actVipLv){
                skinId.push(key);
            }
        }
        return skinId;
    }
    global.compReward = function(rank){
        var rewardInfo = {};
        for (var key in compreward) {
            if(rank <= key){
                rewardInfo = compreward[key];
                break;
            }
        }
        return rewardInfo;
    }

    global.getAllSceneIds = function () {
        var sceneIds = [];
        for (var i in sceneConfigs) {
            if (sceneConfigs[i].Type == 2) {
                sceneIds.push(parseInt(sceneConfigs[i].FishFarm_ID));
            }
        }
        return sceneIds;
    };

    global.getSceneConfigById = function (sceneId) {
        for (var i = 0; i < sceneConfigs.length; i++) {
            if (sceneConfigs[i].FishFarm_ID == sceneId) {
                return sceneConfigs[i];
            }
        }
    };

    global.getAllTracks = pathInfo.getAllTracks;

    global.getFishMap = pathInfo.getFishMap;

    global.getFishDepth = pathInfo.getFishDepth;

    global.getFishInfo = function (fishId) {
        return fishInfo[fishIdTable[fishId]];
    };

    global.getFishInfoByIndex = function (index) {
        return fishInfo2[index];
    };

    //根据scene中的trackIds来获取
    global.getTrackData = function (trackIndex) {
        var trackInfo = tracksIndex[trackIndex];
        var trackName = trackInfo.Track;
        var trackId = trackInfo.Track_id;
        var trackType = trackInfo.Track_type;
        var trackData = pathInfo.getTrackData(trackName);
        return trackData;
    };
    global.getTrackTypeByTrackId = function (trackId) {
        for (var tKey in tracksIndex) {
            if(tracksIndex[tKey].Track_id == trackId){
                return tracksIndex[tKey].Track_type *1;
            }
        }
        /// 没找到就返回普通鱼类别
        return this.fishTrackType.Normal;
    };
    global.getTrackDataByTrackId = function (trackId) {
        ///  查找boss(大/小)类型的鱼路径
        for (var tKey in tracksIndex) {
            if(tracksIndex[tKey].Track_id == trackId &&
                (tracksIndex[tKey].Track_type == this.fishTrackType.SmallBoss ||
                tracksIndex[tKey].Track_type == this.fishTrackType.BigBoss)
            ){
                return this.getTrackData(tKey);
            }
        }
    };
    global.getSceneMaxEnergy = function (fishFarmId) {
        for (var i in sceneConfigs) {
            if (sceneConfigs[i].FishFarm_ID == fishFarmId) {
                return sceneConfigs[i].Energy_Stored_Up;
            }
        }
        return 0;
    };

    global.getSpecialShowTracks = function (fishFarmId) {
        var result = [];
        for (var i in sceneConfigs) {
            if (sceneConfigs[i].FishFarm_ID == fishFarmId) {
                if (!sceneConfigs[i].SpecialTrackShow_Index) {
                    sceneConfigs[i].SpecialTrackShow_Index = "";
                }
                result = sceneConfigs[i].SpecialTrackShow_Index.split('|');
            }
        }
        if (result.length == 0) {
            console.log(" getSpecialShowTracks is null, fishFarmId: " + fishFarmId);
        }
        return result;
    };

    global.getSceneEventType = function (fishFarmId) {
        for (var i in sceneConfigs) {
            if (sceneConfigs[i].FishFarm_ID == fishFarmId) {
                return sceneConfigs[i].SceneEvent_Type;
            }
        }
        return 0;
    };

    global.getWeaponData = function (index) {
        //初始化scene时调用 用于查找weapon id
        for(var key in weaponData){
            if (Number(key) == index)return weaponData[key];
        }
        return null;
    };
    global.getWeaponDataById = function (id) {
        //使用id对weapon时调用
        for(var key in weaponData){
            if (weaponData[key].weapon_id  == id){
                var wInfo = weaponData[key];
                wInfo.weapon_index = key;  ///加上序列号ID
                return wInfo;//weaponData[key];
            }
        }
        return null;
    };
    /**
     *
     * @param matchTypeId
     * @param rankNum
     * @returns {{}}
     */
    global.getCompconfigRewardByRank = function (matchTypeId, rankNum) {
        if(matchTypeId == undefined || rankNum == undefined){
            return;
        }
        var info = global.compConfig[matchTypeId];
        if(info == undefined){return;}

        var rankList = info.competition_ranking.split('|');
        var rewardType = info.reward_type.split('|');
        var rewardNum = info.reward_number.split('|');
        var rewardMaster = info.master_points.split('|');

        var goodInfo = [];
        var index = -1;
        for(var i = 0; i < rankList.length; i++){
            if( rankNum == rankList[i] *1){
                index = i;
            }
            else if( rankNum > rankList[i] *1){
                index = i+1;
            }
        }
        if(index >= 0 && index < rankList.length){
            var l_Type = rewardType[index].split(',');
            var l_Num = rewardNum[index].split(',');
            if(l_Type.length > 1 && l_Num.length > 1){
                for(var j =0; j < l_Type.length; j++){
                    goodInfo.push({type: l_Type[j] *1, number: l_Num[j] *1});
                }
            }else{
                goodInfo.push({type: rewardType[index] *1, number: rewardNum[index] *1});
            }
            if(rewardMaster[index] != undefined && rewardMaster[index] *1 > 0){
                goodInfo.push({type: 1004, number: rewardMaster[index] *1});
            }
        }
        return goodInfo;
    };
    /// 根据上个主题ID得出下轮主题ID的顺序
    global.getRandomFarmIdByLastFarmId = function (matchType, lastFarmId){
        var farmNumList = [];
        if(global.capture[matchType] == undefined){
            return farmNumList;
        }
        else{
            var farmId = global.capture[matchType].competition_scene_id;
            farmNumList = farmId.split('|');
            farmNumList.sort(function(){ return 0.5 - Math.random() });

            if(farmNumList[0] == lastFarmId){
                var i = farmNumList[0];
                var j = farmNumList[1];
                farmNumList[0] = j;
                farmNumList[1] = i;
            }
        }
        return farmNumList;
    };
    global.getFishFarmDataByIndex = function (farmId){
        var tempData = fishFarmConfigs[farmId];
        if(tempData == null || tempData == undefined){
            /// 没找到数据就取第一个
            for(var key in fishFarmConfigs){
                tempData = fishFarmConfigs[key];
                break;
            }
        }
        return tempData;
    }
    //// 根据主题ID获取所有类型鱼的路径信息以及做相关排序
    global.getTrackIdsByFishFarmId = function (farmId, lastFishTideTrackId){
        var tempData = fishFarmConfigs[farmId];
        if(tempData == null || tempData == undefined){
            /// 没找到数据就取第一个
            
            for(var key in fishFarmConfigs){
                tempData = fishFarmConfigs[key];
                break;
            }
        }
        var nomalTrackIndexes = tempData.Track_Index.split('|');
        var samllBossTrackIndexes = tempData.Track_smallBoss.split('|');
        var bigBossTrackIndexes = tempData.Track_bigBoss.split('|');
        var fishTideTrackIndexes = tempData.track_yuchao.split('|');
        var spweaponFishTrackIndexes = tempData.Track_spweapon_fish.split('|');
        var trackIds = {};//[];
        if(trackIds[this.fishTrackType.Normal] == undefined){
            trackIds[this.fishTrackType.Normal] = [];
        }
        if(trackIds[this.fishTrackType.SmallBoss] == undefined){
            trackIds[this.fishTrackType.SmallBoss] = [];
        }
        if(trackIds[this.fishTrackType.BigBoss] == undefined){
            trackIds[this.fishTrackType.BigBoss] = [];
        }
        if(trackIds[this.fishTrackType.FishTide] == undefined){
            trackIds[this.fishTrackType.FishTide] = [];
        }
        if(trackIds[this.fishTrackType.Spweapon] == undefined){
            trackIds[this.fishTrackType.Spweapon] = [];
        }
        /// 鱼种类 普通
        for (var j = 0; j< nomalTrackIndexes.length; j++) {
            var nomalInfo = tracksIndex[nomalTrackIndexes[j]];
            if(nomalInfo == undefined){
                continue;
            }
            trackIds[this.fishTrackType.Normal].push(nomalInfo.Track_id);
        }
        /// 鱼种类 小BOSS
        for (var j = 0; j< samllBossTrackIndexes.length; j++) {
            var samllBossInfo = tracksIndex[samllBossTrackIndexes[j]];
            if(samllBossInfo == undefined){
                continue;
            }
            trackIds[this.fishTrackType.SmallBoss].push(samllBossInfo.Track_id);
        }
        /// 鱼种类 大BOSS
        for (var j = 0; j< bigBossTrackIndexes.length; j++) {
            var bigBossInfo = tracksIndex[bigBossTrackIndexes[j]];
            if(bigBossInfo == undefined){
                continue;
            }
            trackIds[this.fishTrackType.BigBoss].push(bigBossInfo.Track_id);
        }
        /// 打乱顺序
        if(trackIds[this.fishTrackType.SmallBoss].length > 0)
            trackIds[this.fishTrackType.SmallBoss].sort(function(){ return 0.5 - Math.random() });
        if(trackIds[this.fishTrackType.BigBoss].length > 0)
            trackIds[this.fishTrackType.BigBoss].sort(function(){ return 0.5 - Math.random() });

        /// 随机选个鱼潮,当lastFishTideIndex不为空时选定一个
        var tempIndex = -1;
        if(lastFishTideTrackId == undefined) {
            tempIndex = Math.floor(Math.random() * fishTideTrackIndexes.length);
        }
        else{
            if(fishTideTrackIndexes.length > 0)
                fishTideTrackIndexes.sort(function(){ return 0.5 - Math.random() });

            //console.log('==getTrackIdsByFishFarmId==111==>lastFishTideTrackId: ', lastFishTideTrackId,fishTideTrackIndexes);
            var l_tempIndex = -1;
            for (var tKey in tracksIndex) {
                if(tracksIndex[tKey].Track_id *1 == lastFishTideTrackId ) {
                    l_tempIndex = tKey; break;
                }
            }
            tempIndex = fishTideTrackIndexes.indexOf(l_tempIndex);
            tempIndex += 1;
            if(tempIndex > fishTideTrackIndexes.length -1)
                tempIndex = 0;

            //console.log('==getTrackIdsByFishFarmId==333==>tempIndex: ', tempIndex, l_tempIndex);
        }
        var fishTideInfo = tracksIndex[fishTideTrackIndexes[tempIndex]];
        trackIds[this.fishTrackType.FishTide].push(fishTideInfo.Track_id);

        /// 特殊武器鱼
        for (var j = 0; j< spweaponFishTrackIndexes.length; j++) {
            var spweaponInfo = tracksIndex[spweaponFishTrackIndexes[j]];
            if(spweaponInfo == undefined){
                continue;
            }
            trackIds[this.fishTrackType.Spweapon].push(spweaponInfo.Track_id);
        }
        return trackIds;
    }
    global.getLevelByExperience = function(experience){
        if(experience == undefined){
            experience = 0;
        }
        var info = Object.keys(levelInfo);
        var resultLevel = {level:info[0], noviceCoefficient:levelInfo[info[0]].novice_coefficient,reward_type:0,reward_num:0};
        for(var i = info.length-1; i >= 0; i--){
            if(experience >= levelInfo[info[i]].experience *1){
                resultLevel.level = info[i]*1;
                resultLevel.noviceCoefficient = levelInfo[info[i]].novice_coefficient *1;
                resultLevel.reward_type = levelInfo[info[i]].reward_type *1;
                resultLevel.reward_num = levelInfo[info[i]].reward_num *1;
                break;
            }
        }
        return resultLevel;
    };
})();

//预先加载tracks信息
function preLoadTracks() {
    var dir = "./path/";


}