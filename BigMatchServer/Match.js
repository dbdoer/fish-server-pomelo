/**
 * 快速比赛(人满就开始)
 *
 */

var Room = require('./Room.js');
var Match_Status = {
    OPEN : true,
    CLOSE : false
};

var REFRESH_TRACK_INTERVAL = 1000;// 刷新track信息间隔
var BROADCAST_TIME = 2;
var BROADCAST_RANK_AND_RESULT = 3;//排名广播或者结算广播
var AGAIN_ENTER_MATCH = 4; //重新进入比赛
var logger = require("../common/logHelper").helper;

module.exports = Match;

function Match(matchId, matchType, matchManager) {
    this.matchType = matchType;   ///比赛类别ID
    this.matchId = matchId;
    this.matchManager = matchManager;
    this.roomList = {};
    this.matchStatus = Match_Status.CLOSE;  /// 比赛的状态
    this.integralRank = null;  /// 积分排名*有人加入后再初始化为{}*
    this.playerList = {};
    this.init();
}

Match.prototype.init = function () {
    var typeInfo = parseCompConfigType(this.matchType);
    if(typeInfo === undefined){
        console.log('===> BigMatch Initialization failed');
        return ;
    }
    var nowTime = new Date();
    if( nowTime.getHours() >= typeInfo.competition_starttime *1 &&
        nowTime.getHours() < typeInfo.competition_endtime *1 ){
        this.matchStatus = Match_Status.OPEN;
    }
    console.log('===> BigMatch Initialization: ', this.fishFarmIndex);
    this.current = 0;//当前玩家数量
    var self = this;
    this.refreshInterval = setInterval(function () {
        //self.update();
        for (var roomId in self.roomList) {
            self.roomList[roomId].update();
        }
    }, REFRESH_TRACK_INTERVAL); //路径刷新定时器
};

Match.prototype.setMatchStats = function (stats){
    this.matchStatus = stats;
}
Match.prototype.getMatchStats = function (){
    return this.matchStatus;
}
/**
 *
 * @param uid
 * @returns {{room: *, playerList: ({room, playerList}|Number|string)}}
 */
Match.prototype.enterRoom = function (player) {
    //logger.info("Match.enterRoom: entered.");

    var roomInfo = null;
    var self = this;
    //console.log('=====>self.roomList: ', this.roomList)
    for (var roomId in this.roomList) {
        if(this.roomList[roomId] == undefined || this.roomList[roomId].isFull()){
            continue;
        }
        //console.log('====>Match join==>roomId: ',roomId);
        roomInfo = this.roomList[roomId];
        break;
    }
    if(roomInfo == null){
        var options = {
            size: 8,
            type: this.matchType
        };
        var _options = clone(options);
        _options.roomId = ++ Object.keys(this.roomList).length;
        roomInfo = new Room(_options);
        this.roomList[_options.roomId] = roomInfo;
        this.roomList[_options.roomId].on("close", function (tempRoomId) {
            if(self.roomList[tempRoomId] !== undefined){
                self.roomList[tempRoomId] = {};
                delete self.roomList[tempRoomId];
            }
        });
        this.roomList[_options.roomId].on("leave", function (playerId) {
            /// 退出房间后,要保持相应的数据(子弹数\金币\分数)
            var info = self.playerList[playerId];
            if(info == undefined){
                logger.err('==BigMatch Leave Room===>info playerId:[%s] == undefined', playerId);
            }else{
                self.integralRank[info.uid].integral = info.integral;
                self.integralRank[info.uid].bullet = info.bullet;
                self.integralRank[info.uid].curTaskFishNum = info.curTaskFishNum;
                self.matchManager.saveIntegralRankByMatchTypeId(self.matchType,self.integralRank);
            }
        });
    }
    this.playerList[player.uid] = player;
    roomInfo.join(player);
    //console.log('====>Match join==>roomList.length: ',Object.keys(self.roomList).length);

    if(this.integralRank == null){
        this.integralRank = {};
    }
    /// 第一次进入,则存入redis中
    if(this.integralRank[player.uid] == undefined){
        this.integralRank[player.uid] = {uid: player.uid, name: player.name, integral: player.integral,
            bullet: player.bullet, maxIntegral: player.maxIntegral, curTaskFishNum: player.curTaskFishNum};
        this.matchManager.saveIntegralRankByMatchTypeId(this.matchType,this.integralRank);
    }

    //logger.info("Match.enterRoom: leaved.");

    return {
        room: roomInfo
    };
};
/**
 *
 */
Match.prototype.releaseMatchInfo = function (){
    var self = this;
    //// 比赛结束后清空
    for (var k in this.roomList) {
        this.roomList[k] = {};
        delete this.roomList[k];
    }
    this.playerList = {};
    this.rankList = {};
    this.integralRank = {};
    clearInterval(this.refreshInterval);
    //this.matchManager.saveIntegralRankByMatchTypeId(this.matchType,this.integralRank);
}
/**
 * 排序
 * 重排排名
 * */
Match.prototype.sort = function () {
    var self = this;
    var tempArray = [];
    for (var k in this.integralRank) {
        tempArray.push(this.integralRank[k]);
    }
    /*tempArray.sort(function (a, b) {
        return Number(self.playerList[b].score) - Number(self.playerList[a].score);
    });*/
    var num = null;
    for(var t = 0; t< tempArray.length; t++){
        for(var k = 0; k< tempArray.length; k++){
            if(self.playerList[tempArray[t]].integral > self.playerList[tempArray[k]].integral) {
                num = tempArray[t];
                tempArray[t] = tempArray[k];
                tempArray[k] = num;
            }
        }
    }
    for (var i = 0; i < tempArray.length; i++) {
        this.integralRank[i + 1] = tempArray[i];
    }
};

/**
 * 比赛级的广播
 * 向所有当前比赛玩家进行广播
 * @param type{int}广播类型
 * @param data{object}广播内容
 * @param specialData{object}对应uid添加的个人内容
 * */
Match.prototype.broadcast = function (type, data, specialData) {
    var pid = -1;
    var pName;

    switch (type) {
        /*case BROADCAST_WAIT_PROCESS:
            pid = 4269;
            pName = 'SC_BroadcastFastMatchProcess';
            break;*/
        default:
            break;
    }
    if (pid < 0)
        return;

    for (var k in this.playerList) {
        var _data = clone(data);
        if (specialData && specialData[k]) {
            for (var key in specialData[k]) {
                _data[key] = specialData[k][key];
            }
        }
        this.playerList[k].sendMsg(pid, pName, _data);
    }
};


function parseCompConfigType(matchTypeId) {
    return global.compConfig[matchTypeId];
}

function clone(obj) {
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    var copy;
    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; ++i) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}