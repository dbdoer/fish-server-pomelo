/**
 * 比赛管理
 */

var Match = require('./Match.js');
var async = require('async');
var _underscore = require("underscore");
var fileOther = require("../Resources/other.json")["1"];

var redis;
var REDIS_KEY_MAIL = "fish4mail:";// mail
var REDIS_KEY_BIG_MATCH = "fish4bigMatch:";//大奖赛记录
var HOURS = 19,MINUTES = 02;

module.exports = function (serverId, rpcManager, playerManager, _redis) {
    redis = _redis;
    return new MatchManager(serverId, rpcManager, playerManager);
};

function MatchManager(serverId, rpcManager, playerManager) {
    this.rpcManager = rpcManager;
    this.playerManager = playerManager;
    this.matches = {};//比赛列表
    this.matchType = {};//类型列表

    this.serverId = serverId;
    this.init();  //// 创建比赛,且是否开放比赛
    this.regularEvent();
}

//初始化大奖赛内部排名信息
MatchManager.prototype.init = function (){
    var nowTime = new Date();
    var arrKeys = [];
    for(var gKey in global.compConfig){
        var name = global.compConfig[gKey].competition_name;
        if(name.indexOf("大奖赛") >= 0){
            var matchID = nowTime.getTime();   ////时间戳当比赛ID
            this.createBigMatch(matchID, gKey);
            arrKeys.push(gKey);
        }
    }

    var count = 0;
    var self = this;
    async.whilst(
        function () {
            return count < arrKeys.length;
        },
        function (callBack) {

            redis.hgetall(REDIS_KEY_BIG_MATCH + arrKeys[count], function (err, dataBigMatch) {
                if (err || err != undefined) {
                    callBack(err);
                    return;
                }
                if(dataBigMatch == undefined){
                    callBack(1010);
                    return;
                }
                if(self.matches[arrKeys[count]].integralRank == null){
                    self.matches[arrKeys[count]].integralRank = {};
                }
                //console.log('=REDIS_KEY_BIG_MATCH==>err: ',err ,dataBigMatch);
                for(var key in dataBigMatch){
                    if(dataBigMatch[key] == undefined){
                        continue;
                    }
                    self.matches[key].integralRank = JSON.parse(dataBigMatch[key]);
                }
                count ++;
                callBack();
            });
        },
        function (err) {
            //console.log('=PlayerManager careteMailInfo==>self.matches: ',self.matches);
            if (err || count >= arrKeys.length) {
                return;
            }
        }
    );
};

/**
 * 排名奖励
 */
MatchManager.prototype.awardBySort = function(){
    var self = this;
    //周期循环
    self.everyFiveSecondsTime = setTimeout(function(){
        self.awardBySort();
    }, 24*60*60*1000);

    var nowDate = new Date();
    //console.log('==+++====>bigmatch_awardtime: ', fileOther.bigmatch_awardtime);
    if(nowDate.getHours() == fileOther.bigmatch_awardtime && nowDate.getMinutes() == 0 && nowDate.getSeconds() < 5){
        var tempMatches = [];
        if(!_underscore.isArray(self.matches)){
            //tempMatches = [self.matches];
            for(var key in self.matches){
                tempMatches.push(self.matches[key]);
            }
        }
        var count = 0;
        var tempMailInfo = [];
        var tempUserUid = [];
        async.whilst(
            function () {
                return count < tempMatches.length;
            },
            function (callBack) {
                var tempMatch = tempMatches[count];
                if(tempMatch == undefined){
                    callBack(1);
                    return;
                }

                var tIntegralRank = tempMatch.integralRank;
                //console.log('==+++====>tIntegralRank: ', tIntegralRank);
                if(tIntegralRank == null || tIntegralRank == undefined || Object.keys(tIntegralRank).length <= 0){
                    count ++;
                    callBack();
                    return;
                }
                /// 根据得分高低先排序
                var tempRank = [];
                for(var tKey in tIntegralRank){
                    if(tIntegralRank[tKey] == undefined){continue;}
                    tempRank.push({uid:tIntegralRank[tKey].uid, integral: tIntegralRank[tKey].integral *1})
                }

                tempRank = tempRank.sort(function(a, b){
                    return a.integral < b.integral;
                })

                var matchName = global.compConfig[tempMatch.matchType].competition_name;
                matchName = matchName.substring(matchName.length -3);
                var templeId = 3;
                var tempMail = global.mail[templeId];
                var strArr = tempMail.content.split('%s');
                for(var i = 0; i < tempRank.length; i++){
                    var goodInfos = global.getCompconfigRewardByRank(tempMatch.matchType, i+1);
                    if(goodInfos == null || goodInfos == undefined){
                        console.log('===> goodInfos null || undefined <===');
                        continue;
                    }
                    var playerInfo = tIntegralRank[tempRank[i].uid];
                    var repContent = [];
                    var mailGoods = [];
                    if(strArr.length > 0 && tempMail.mail_type *1 == 2)
                    {///有字符替换
                        repContent[0] = playerInfo.name;
                        repContent[1] = matchName;
                        repContent[2] = i +1;
                    }

                    /*if(tempMail.reward_type *1 >= 1){
                        for(var g =0; g <goodInfos.length; g++) {
                            mailGoods.push({goodId: goodInfos[g].type, goodNum: goodInfos[g].number});
                        }
                    }*/
                    for(var g =0; g <goodInfos.length; g++) {
                        if(goodInfos[g] == undefined){ continue; }
                        mailGoods.push({goodId: goodInfos[g].type, goodNum: goodInfos[g].number});
                    }
                    tempMailInfo.push({
                        type: tempMail.mail_type,
                        templateId: templeId,
                        replacement: repContent,
                        itemList: mailGoods
                    });
                    tempUserUid.push(tempRank[i].uid);
                }
                count ++;
                callBack();
            },
            function (err) {
                if (err) {
                    console.log('==111==err=====>Err: ',err);
                    return;
                }

                if(count >= tempMatches.length) {
                    //console.log('==11111111111=====>tempMailInfo, tempUserUid: ', tempMailInfo, tempUserUid);
                    /// 根据排名发放奖励*邮件形式*
                    var rpcTS = self.rpcManager.getRpcByRType('TransfeServer');
                    if (rpcTS != undefined) {
                        var method = rpcTS.getMethod('sendMailInfo');
                        if (method != undefined) {
                            method({sendType: 1, mailInfo: tempMailInfo, userInfo: tempUserUid}, function (err) {
                                if (err) {
                                    console.log('==111==sendMailInfo=====>Err!!');
                                    return;
                                }
                                ////结算后清空
                                for(var key in self.matches){
                                    self.matches[key].releaseMatchInfo();
                                    self.saveIntegralRankByMatchTypeId(key,self.matches[key].integralRank);
                                }
                            });
                        }
                    }
                }
            });
    }
    else{
        /// 判断比赛的是否开放
        for(var mKey in self.matches) {
            var match = self.matches[mKey];
            if(match == undefined || global.compConfig[mKey] == undefined){
                continue;
            }
            var startTime = global.compConfig[mKey].competition_starttime *1;
            var endTime = global.compConfig[mKey].competition_endtime *1;
            if(nowDate.getHours() >= startTime && nowDate.getHours() < endTime ){
                match.setMatchStats(true);
            }else{
                match.setMatchStats(false);
            }
        }
    }
};

/**
 * 第一次根据启服时间倒计时触发，大奖赛每天0点发放奖励
 */
MatchManager.prototype.regularEvent = function(){
    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth()+1;
    var day = date.getDate();
    var fire = new Date(year+"-"+month+"-"+day+" "+ fileOther.bigmatch_awardtime + ":00:00");

    var self = this;
    this.everyFiveSecondsTime = setTimeout(function(){
        self.awardBySort();
    }, fire.getTime()+24*60*60*1000 - date.getTime());

};

/**
 * 创建比赛信息
 * */
MatchManager.prototype.createBigMatch = function (matchId, matchType) {
    this.matches[matchType] = new Match(matchId, matchType, this); //创建新的match
    if (!this.matchType[matchType]) {
        this.matchType[matchType] = [];
    }
    /*var nowDate = new Date();
    var startTime = global.compConfig[matchType].competition_starttime *1;
    var endTime = global.compConfig[matchType].competition_endtime *1;
    if(nowDate.getHours() >= startTime && nowDate.getHours() < endTime ){*/
        this.matches[matchType].setMatchStats(true);
    //}
};

/**
 * 加入比赛
 * */
MatchManager.prototype.joinBigMatchById = function (serverId, playerUid, resData, playerInfo, cb) {

    if(resData == undefined || playerUid == undefined){
        cb(1, null);return;
    }
    var matchTypeId = resData.matchType;
    /*console.log('--------------------------matchTypeId ',matchTypeId);
    if(matchTypeId == 1111004){
        cb(501, null);return;
    }*/
    var isAgainMatch = resData.isAgainMatch;
    var self = this;

    var tempMatchInfo = self.matches[matchTypeId];
    if(tempMatchInfo == undefined || global.compConfig[matchTypeId] == undefined){
        cb(2, null);return;
    }
    /// 比赛是否开始
    if(tempMatchInfo.getMatchStats() == false){
        cb(3, null);return;
    }

    if(tempMatchInfo.integralRank == undefined || tempMatchInfo.integralRank == null){
        tempMatchInfo.integralRank = {}
    }
    /// redis数据中没找到自己
    var selfRankInfo = tempMatchInfo.integralRank[playerUid];
    if(selfRankInfo == null || selfRankInfo == undefined){
        selfRankInfo ={};
        selfRankInfo.bullet = global.compConfig[matchTypeId].ammo_number *1;
        selfRankInfo.integral = 0;
        selfRankInfo.maxIntegral = 0;
        selfRankInfo.curTaskFishNum = 0;
    }
    /// 是否需要重新比赛,是则扣除相应费用
    //var againCostGem = 0;
    if(isAgainMatch == true && selfRankInfo.bullet <= 0){
        // /// 判断钻石是否充足
        // if(playerInfo.gem < global.compConfig[matchTypeId].again_cost *1){
        //     cb(101, null);return;
        // }
        if(selfRankInfo.maxIntegral < selfRankInfo.integral){
            selfRankInfo.maxIntegral = selfRankInfo.integral;
        }
        selfRankInfo.integral = 0;
        selfRankInfo.bullet = global.compConfig[matchTypeId].ammo_number *1;
        //againCostGem = global.compConfig[matchTypeId].again_cost *1;
    }
    //console.log('=joinBigMatchById===>selfRankInfo: ', selfRankInfo)
    this.playerManager.caretePlayer(playerUid, serverId, selfRankInfo, playerInfo, function(err, resPlayer){
        if(err != null || resPlayer == undefined){
            cb(4, null);return;
        }

        /// 将比赛Match信息加入Player.js去
        resPlayer.setMatch(tempMatchInfo);
        cb(null, self.serverId);
    });
};

/**
 *
 * @returns {{rankInfo: Array}}
 */
MatchManager.prototype.getBigMatchInfo = function () {
    var infoList = {rankInfo:[]};
     for(var key in this.matches){
        var matchInfo = this.matches[key];
        if(matchInfo.integralRank == undefined){
            continue;
        }
        var pushArr = [];
        for(var iKey in matchInfo.integralRank){
            var rankInfo = matchInfo.integralRank[iKey];
            if(rankInfo == undefined){
                continue;
            }
            pushArr.push({uid: rankInfo.uid, name: rankInfo.name, integral: rankInfo.integral});
        }
        //str[key] = pushArr;
        infoList.rankInfo.push({rankList:pushArr});
    }
    //console.log('==getBigMatchInfo===>infoList: ', JSON.stringify(infoList));
    return infoList;
};

/// 获取比赛中的个人数据(日志系统的需求)
MatchManager.prototype.getBigMatchOfSelfInfoByUid = function (playerUid) {
    var resultLists = null;
    if(playerUid == undefined){
        return resultLists;
    }
    for(var key in this.matches){
        var matchInfo = this.matches[key];
        var tIntegralRank = matchInfo.integralRank;
        //console.log('==+++====>tIntegralRank: ', tIntegralRank);
        if(tIntegralRank == null || tIntegralRank == undefined || Object.keys(tIntegralRank).length <= 0){
            continue
        }
        var selfInfo = tIntegralRank[playerUid];
        if(selfInfo != undefined){
            resultLists = {};
            resultLists[key] = {
                maxIntegral: selfInfo.maxIntegral,
                integral: selfInfo.integral,
                bullet: selfInfo.bullet,
                taskFishNum: selfInfo.curTaskFishNum
            };
            /// 根据得分高低先排序
            var tempRank = [];
            for(var tKey in tIntegralRank){
                if(tIntegralRank[tKey] == undefined){continue;}
                tempRank.push({uid:tIntegralRank[tKey].uid, integral: tIntegralRank[tKey].integral *1})
            }

            tempRank = tempRank.sort(function(a, b){
                return a.integral < b.integral;
            })
            /// 找出自己的排名
            for(var i =0; i< tempRank.length; i++){
                if(tempRank[i].uid == playerUid){
                    resultLists[key].rankNum = i +1;break;
                }
            }
        }
    }
    return resultLists;
};

/**
 *
 * @param playerUid
 * @param matchTypeId
 * @returns {*}
 */
MatchManager.prototype.getSelfBigMatchScore = function (playerUid){
    if(playerUid == undefined){
        return;
    }
    var scoreList =[];
    var l_Index = 0; //代表对象的索引
    for(var key in this.matches) {
        var matchInfo = this.matches[key];
        l_Index += 1;
        if (matchInfo == undefined) {
            continue;
        }
        var rankInfo = matchInfo.integralRank[playerUid];
        if (rankInfo == undefined) {
            continue;
        }
        scoreList.push({typeId: key, curScore: rankInfo.integral *1, maxScore: rankInfo.maxIntegral *1,curBullet: rankInfo.bullet *1})
    }
    if(l_Index < scoreList.length){
        return;
    }
    return scoreList;
};
/**
 *
 * @param matchTypeId
 * @param data
 */
MatchManager.prototype.saveIntegralRankByMatchTypeId = function(matchTypeId, data){
    if(matchTypeId == undefined || data == undefined){
        console.log('=saveIntegralRankByMatchTypeId == undefined');
        return;
    }
    var saveData = {};
    saveData[matchTypeId] = JSON.stringify(data);
    //console.log('=saveIntegralRankByMatchTypeId==>matchTypeId,data: ',saveData);
    redis.hmset(REDIS_KEY_BIG_MATCH + matchTypeId, saveData, function (err, result) {
        if (err) {
            console.log('=saveIntegralRankByMatchTypeId==>ERR: ',err);
        }else
            console.log('=saveIntegralRankByMatchTypeId==>OK!', matchTypeId);
    });
};

function parseCompConfigType(matchId) {
    return global.compConfig[matchId];
}