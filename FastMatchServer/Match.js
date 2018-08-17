/**
 * Created by Author.
 * 快速比赛(人满就开始)
 *
 */

var Room = require('./Room.js');
var RobotMng = require('./RobotManager.js');
var logger = require("../common/logHelper").helper;
var countUserFastMatch = require("./countUserFastMatch");
var BROADCAST_WAIT_PROCESS = 1; //等待进度广播
var BROADCAST_TIME = 2;
var BROADCAST_RANK_AND_RESULT = 3;//排名广播或者结算广播
var BROADCAST_WAIT_MATCH_TIME = 4;

module.exports = Match;

function Match(matchId, type, matchManager) {
    this.type = type;   ///比赛类别ID
    this.matchId = matchId;
    this.matchManager = matchManager;
    this.roomList = {};
    this.playerList = {}; //用于排名
    this.rankList = {};  //有序的排名
    //this.robotManager = new RobotMng(this);
    this.init();
}

Match.prototype.init = function () {
    var typeInfo = parseCompConfigType(this.type);
    var captureInfo = parseCaptureType(this.type);
    console.log('info ===> Match  init type=%s matchid=%s' ,this.type , this.matchId);
    if(typeInfo === undefined || captureInfo === undefined){
        console.log('error ===> Match Initialization failed =' + this.type)
        return ;
    }

    //最大参赛人数
    this.total = typeInfo.competition_playerlimit;
    this.total = typeInfo.competition_playerlimit;
    this.cost = typeInfo.competition_cost;
    this.sceneConfig = global.getSceneConfigById(this.type);
    this.timeCounter = typeInfo.competition_length;  ///this.sceneConfig.duration;// 根据配置文件修改

    //this.timeCounter = 15;

    this.taskFishReward = typeInfo.bonus *1;
    this.targetTaskFishNum = captureInfo.task_fish_num *1;
    this.taskFishType = captureInfo.task_fish_id *1;
    this.current = 0;//当前玩家数量
    var self = this;
    //计算房间数量
    var roomNum = Math.floor(self.total / 8) + (self.total % 8 ? 1:0);
    //var farmId = captureInfo.competition_scene_id.split('|');
    //var farmInfo = global.getFishFarmDataByIndex(farmId[0]);  ///临时加为了找到FishFarm_ID
    //this.farmIndexList = global.getRandomFarmIdByLastFarmId(this.type, null);
    //this.fishFarmIndex = this.farmIndexList[0];
    //console.log('===> FastMatch Initialization: ', this.fishFarmIndex);
    var options = {
        //farmIndex: this.fishFarmIndex,
        matchTypeId: self.type,
        size: roomNum > 1 ? 8 : self.total
    };

    //创建一个房间同时注册事件
    var createRoom = function(_options){
        var room = new Room(_options);
        room.on("close", function (tempRoomId) {
            // 房间关闭时 清空记录
            if(self.roomList[tempRoomId] == undefined){
                return;
            }
            var roomCount = 0;
            for (var k in self.roomList) {
                if(self.roomList[k].playerCount <= 0){
                    roomCount += 1;
                }
            }
            if(roomCount >= Object.keys(self.roomList).length){
                self.roomList = {};
                self.releaseMatchInfo();
            }
        });

        room.on("leave", function (playerId) {
            var rpc = self.matchManager.rpcManager.getRpcByRType('MatchQueueServer');
            var method = rpc.getMethod('leaveMatch');
            //console.log('====>Match leave==> playerId: %s',playerId);
            if (method) {
                self.unSignUp(playerId);
                //console.log('====>unSignUp %s',playerId);
                method(self.matchId);
            }
        });

        room.setMatchInfo({timeCounter: self.timeCounter,current:self.current});
        return room;
    };

    //比赛所需要的房间
    for (var i = 1; i < roomNum+1; i++) {
        options['roomId'] = i;
        this.roomList[i] = createRoom(options);
    }
};

/**
 * 报名
 * 将玩家加入到比赛中
 * 广播等人进度
 *  */
Match.prototype.signUp = function (player) {
    //console.log('Match SignUp total=%s,current=%s, match=%s', this.total, this.current, this.matchId);
    this.playerList[player.uid] = player;
    this.current++;
    this.rankList[this.current] = player.uid;
    player.setMatch(this);

    countUserFastMatch.SignUp(this.type, player.isRobot());
};
/**
 * 取消报名
 *
 *  */
Match.prototype.unSignUp = function (uid) {
    //console.log('===Match SignUp==11111==>total,current: ', this.total, this.current);

    var player = this.playerList[uid];
    if(player){
        countUserFastMatch.UnSign(this.type,player.isRobot());
    }


    delete this.playerList[uid];
    this.current --;
    for (var key in this.rankList) {
        if(this.rankList[key] == uid){
            delete this.rankList[key];   ///排名列表中删除
            break;
        }
    }
    ///重新将排名数据进行排序
    var newRank = {};
    var index = 1;
    for (var key in this.rankList) {
        newRank[index] = this.rankList[key];
        index ++;
    }
    this.rankList = newRank;
    //console.log('===Match unSignUp==11111==>rankList: ', this.rankList);
    //console.log('=++++=unSignUp===>current,playerList,rankList: ',this.current,Object.keys(this.playerList).length,Object.keys(this.rankList).length)
    return true;

};
/**
 * 由FrontServer调用
 * 将玩家加入到某个房间中
 * 加入房间策略 填满一个再填下一个
 * */
Match.prototype.join = function (uid) {

    var self = this;
    if(self.playerList[uid] == undefined ||
        self.playerList[uid] == null){
        return null;
    }

    var getRoom = function(){
        for (var roomId in self.roomList) {
            var _r = self.roomList[roomId];
            if( !_r || _r.isFull()){
                continue;
            }
            return _r;
        }
        return null;
    }

    var room = getRoom();
    if(!room){
        //console.log('Match join==>roomList.length: %d, match=%s',Object.keys(self.roomList).length, this.matchId);
        logger.err('FastMatch Room = null  uid='+uid )
        return null;
    }

    //房间中添加player
    room.join(this.playerList[uid]);

    this.broadcast(BROADCAST_WAIT_PROCESS, {
        current: this.current
    }, null);

    if (this.current == this.total) {
        setTimeout(function () {
            self.start();
        },4500); // 开始比赛的条件达成后,延后4.5秒才开始
    }

    return {
        room: room,
        playerList: room.getPlyersInfo(),
        taskFishReward: this.taskFishReward,
        targetTaskFishNum: this.targetTaskFishNum,
        taskFishType: this.taskFishType
    };
};
/**
 * 开始比赛
 * */
Match.prototype.start = function () {
    //console.log('Match ==> start -------------------++++++++++++++++++');
    var self = this;
    if(self.timer == undefined) {
        self.timer = setInterval(function () {
            //console.log('Match ==> self.timer: ', self.timeCounter, self.matchId);
            self.update();
            if (self.timeCounter <= 0) {
                clearInterval(self.timer);
            }
        }, 1000);
    }

    //this.robotManager.startAI();

    for (var k in this.roomList) {
        this.roomList[k].start();
    }
};

/**
 * 每秒更新
 * */
Match.prototype.update = function () {
    ///比赛时间为0时结束比赛
    if (--this.timeCounter <= 0 && this.timeCounter > -1) {
        logger.debug('timeout stop the match, timeCounter = '+ this.timeCounter + " ,matchId = "+ this.matchId);
        this.stop();
    }

    ///所有玩家的子弹为0时结束比赛
    var zeroBullet = 0;
    for(var pKey in this.playerList) {
        if(this.playerList[pKey].bullet *1 <= 0){
            zeroBullet += 1;
        }
    }if (zeroBullet >= Object.keys(this.playerList).length) {
        console.log('all bullet is zero, stop the match');
        this.stop();
    }
    if (this.timeCounter > 0 && this.timeCounter % 2 == 0) {
        //最后一次不广播
        this.broadcast(BROADCAST_TIME, {time: this.timeCounter}, null);
    }
    //// 比赛结束后清空
    for (var k in this.roomList) {
        if (this.timeCounter > 0) {
            this.roomList[k].update();
        }else {
            this.playerList = {};
            this.rankList = {};
            this.roomList[k] = {};
        }
    }
};

/**
 * 停止比赛
 * 进行结算
 * */
Match.prototype.stop = function () {

    if (this.timeCounter <= 0 || this.timer != undefined) {
        clearInterval(this.timer);
    }
    //this.robotManager.stopAI();
    this.sort();
    var list = [];
    var _total = this.total;
    var rewardList = [];
    for (var i = 1; i <= _total; i++) {
        var uid = this.rankList[i];
        var player = this.playerList[uid];
        var tempReward = this.getRewardToRank(i);
        if(uid.indexOf("robot") < 0 && tempReward != undefined && tempReward.length > 0){
            var compConfig = global.compConfig[this.type];
            var matchName = compConfig.competition_name;
            matchName = matchName.substring(matchName.length -3);
            rewardList.push({uid: uid, name: player.name, matchPlayerNum: compConfig.competition_playerlimit,matchName: matchName, rankNum: i,goodsList: tempReward});
        }

        if (i <= _total) { //发出去的最大不超过this.total人
            list.push({
                uid: uid,
                name: player.name,
                headurl: player.headurl,
                rank: i,
                score: player.score,
                reward:tempReward || []
            });
        }
    }
    /// 将奖励的物品添加到背包*不在线则发邮件*
    this.sendRankRewardByFrontServer(rewardList);

    for (var k in this.roomList) {
        this.roomList[k].stop();
    }

    //广播结算结果
    this.broadcast(BROADCAST_RANK_AND_RESULT, {
        finish: true,
        list: list
    }, null);

    for (var rKey in this.roomList) {
        this.releaseMatchInfo(rKey);
    }

    var totalRobot = function(list){
        var total = 0;
        for(var k in list){
            var p = list[k];
            if(p && p.isRobot()){
                total ++;
            }
        }
        return total;
    }

    var robotnum = totalRobot(this.playerList);
    countUserFastMatch.CloseRoom(this.type, robotnum, true);
    countUserFastMatch.CloseRoom(this.type, _total - robotnum);
};

Match.prototype.releaseMatchInfo = function (tempRoomId){
    // 房间关闭时 清空记录
    var self = this;
    if(tempRoomId != undefined){
        delete self.roomList[tempRoomId];
    }

    if( Object.keys(self.roomList).length <= 0){
        /// 所有房间都清空后,则删除比赛ID
        clearInterval(self.timer);
        var rpc = self.matchManager.rpcManager.getRpcByRType('MatchQueueServer');
        var method = rpc.getMethod('closeMatch');
        if (method) {
            method(self.matchId);
        }
        self.matchManager.releaseMatch(self.matchId);
    }
}

/*
* 根据排名给出奖励
* */
Match.prototype.getRewardToRank = function (rank) {
    var typeInfo = parseCompConfigType(this.type);
    var rankArr = typeInfo.competition_ranking.split('|');
    var rType = typeInfo.reward_type.split('|');
    var rNum = typeInfo.reward_number.split('|');
    var rMaster = typeInfo.master_points.split('|');
    var returnInfo = [];
    for(var i =0; i < rankArr.length; i++){
        if(Number(rankArr[i]) == rank){
            var l_Type = rType[i].split(',');
            var l_Num = rNum[i].split(',');
            if(l_Type.length > 1 && l_Num.length > 1){
                for(var j =0; j < l_Type.length; j++){
                    returnInfo.push({type: l_Type[j] *1, number: l_Num[j] *1});
                }
            }else{
                returnInfo.push({type: rType[i] *1, number: rNum[i] *1});
            }
            if(rMaster[i] != undefined && rMaster[i] *1 > 0){
                returnInfo.push({type: 1004, number: rMaster[i] *1});
            }
            //return {type: rType[i] *1, number: rNum[i] *1, masterNum: Number(rMaster[i])};
        }
    }
    return returnInfo;
};
/**
 * 排序
 * 重排排名
 * */
Match.prototype.sort = function () {
    var self = this;
    var tempArray = [];
    for (var k in this.rankList) {
        tempArray.push(this.rankList[k]);
    }
    /*tempArray.sort(function (a, b) {
        return Number(self.playerList[b].score) - Number(self.playerList[a].score);
    });*/
    var num = null;
    for(var t = 0; t< tempArray.length; t++){
        for(var k = 0; k< tempArray.length; k++){
            if(self.playerList[tempArray[t]].score > self.playerList[tempArray[k]].score) {
                num = tempArray[t];
                tempArray[t] = tempArray[k];
                tempArray[k] = num;
            }
        }
    }
    for (var i = 0; i < tempArray.length; i++) {
        this.rankList[i + 1] = tempArray[i];
    }
};

/**
 * 某个玩家的分数发生变化
 * @param player{Player} 发生变化的玩家
 * */
Match.prototype.onPlayerScoreChanged = function (player) {
    var index = -1;
    for (var k in this.rankList) {
        if (this.rankList[k] == player.uid) {
            index = parseInt(k);
        }
    }
    if (index == -1)return;
    var toIndex = -1;
    for (var i = 1; i <= index; i++) {
        if (player.score >= this.playerList[this.rankList[i]].score) {
            toIndex = i;
            break;
        }
    }
    if (toIndex == -1)return;
    for (var i = index; i > toIndex; i--) {
        this.rankList[i] = this.rankList[i - 1];
    }
    this.rankList[toIndex] = player.uid;

    //当前用户排名
    player.sendMsg(4301,'SC_FastMatchRankSelf', {self:{
        rank: toIndex,
        score: player.score
    }});
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
        case BROADCAST_WAIT_PROCESS:
            pid = 4269;
            pName = 'SC_BroadcastFastMatchProcess';
            break;
        case BROADCAST_TIME:
            pid = 4268;
            pName = 'SC_FastMatchTime';
            break;
        case BROADCAST_RANK_AND_RESULT:
            pid = 4267;
            pName = 'SC_FastMatchRank';
            break;
        case BROADCAST_WAIT_MATCH_TIME:{
            pid = 4290;
            pName = 'SC_FastMatchWaitTime';
        }break;
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
/**
 *
 * @param paramReward ///[{uid: 0, goodsList: {goods: [{type: 0,number: 0},..], matserNum:0}},...]
 * @returns {boolean}
 */
Match.prototype.sendRankRewardByFrontServer = function(paramReward){
    if(paramReward == undefined || this.matchManager == undefined ||
        this.matchManager.rpcManager == undefined)
    {
        return false;
    }

    var rpcTS = this.matchManager.rpcManager.getRpcByRType("FrontServer");
    if (rpcTS != undefined) {
        var methodTS = rpcTS.getMethod('fastMatchRankReward');
        if (methodTS != undefined) {
            methodTS(paramReward, function (err){
                if(err != undefined|| err != null){
                    console.log('==FrontServer.fastMatchRankReward()=====>err: ',err);
                }
            });
            return true;
        }
    }
    return false;
}

function parseCompConfigType(matchId) {
    return global.compConfig[matchId];
}
function parseCaptureType(matchTypeId) {
    return global.capture[matchTypeId];
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

//当前比赛的排名信息
Match.prototype.getRankTopN = function (num) {
    var max = num;
    if(this.total < max){
        max = this.total;
    }

    var pl = this.playerList;
    var list = [];
    for(var k in pl){
        if(pl[k] == undefined){continue;}
        var player = pl[k];
        var score = player.score;
        list.push({
            uid: player.uid,
            name: player.name,
            headurl: player.headurl,
            rank: -1,
            score: score
        });
    }

    list.sort(function(x, y){
        return y.score - x.score;
    });

    var listTopN = [];
    for(var n=0; n<max; n++){
        if(list[n] == undefined){continue;}
        var p = list[n];
        p.rank = n + 1;
        listTopN.push(p);
    }

 return {
        finish: false,
        list: listTopN
 };
}