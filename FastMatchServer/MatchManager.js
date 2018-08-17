/**
 * Created by Author.
 * 比赛管理
 */

var Match = require('./Match.js');

module.exports = function (playerManager, rpcManager) {
    return new MatchManager(playerManager, rpcManager);
};

function MatchManager(playerManager, rpcManager) {
    this.playManager = playerManager;
    this.rpcManager = rpcManager;

    this.matches = {};//比赛列表
    this.matchType = {};//类型列表
}

/**
 * 得到一个比赛信息
 * */
MatchManager.prototype.getInspectionMatch = function (uid/*,matchId*/) {
    var self = this;
    var result = null;
    var getInfo =function(matche, player){
        player.reConnect();
        var room = player.room;
        var roomInfo = {};
        var info = room.getRoomInfo();
        if(!info){
            return null;
        }

        roomInfo.time = info.time;
        roomInfo.pathinfo = info.pathinfo;
        roomInfo.tracktime = info.tracktime;
        roomInfo.deadfishs = info.deadfishs;
        roomInfo.explosionQiLin = info.explosionQiLin;
        roomInfo.showTop = matche.getRankTopN(8).list;
        roomInfo.curFishFarmId = room.fishFarmId;

        var userList = [];
        var list = room.playerPos;
        for(var k in list){
            var tp = list[k];
            if(tp == undefined){continue;}
            var userInfo = tp.getUserInfo();
            userInfo.score = tp.score;//分数
            for(var j in matche.rankList){
                if(matche.rankList[j] == userInfo.uid){
                    userInfo.rank = j*1;
                    break;
                }
            }
            userInfo.curTaskFishNum = tp.curTaskFishNum;//任务鱼数
            userList.push(userInfo);
        }
        roomInfo.userList = userList;
        roomInfo.matchServerId = matche.matchServerId;
        roomInfo.taskFishReward = matche.taskFishReward;
        roomInfo.targetTaskFishNum = matche.targetTaskFishNum;
        roomInfo.taskFishType = matche.taskFishType;
        roomInfo.matchId = matche.matchId;

        return roomInfo;
    }


    for(var key in self.matches){
        var m = self.matches[key];
        if(m &&
            m.playerList!== undefined &&
            m.playerList[uid] !== undefined /*matchId === this.matches[key].type &&*/){
            var player = m.playerList[uid];
            if(!player || !player.room){
                continue;
            }
            result =  getInfo(m, player);
            break;
        }
    }

    return result;
};
/**
 * 创建一个新场新的比赛
 * */
MatchManager.prototype.createMatch = function (matchId, type, matchServerId) {
    this.matches[matchId] = new Match(matchId, type, this); //创建新的match
    if (!this.matchType[type]) {
        this.matchType[type] = [];
    }
    this.matches[matchId].matchServerId = matchServerId;
    this.matchType[type].push(matchId);//将新的match添加到类型列表中 ps:目前没用
};

/**
 * 报名
 * 将player添加到playerManager
 * 并将player添加到对应match中的某个room里
 * */
MatchManager.prototype.signUp = function (uid, fServerId, matchId) {
    var self = this;
    this.playManager.addPlayer(uid, fServerId, function (err, player) {
        var match = self.matches[matchId];
        if(match){
             match.signUp(player);
        }
    });
};
MatchManager.prototype.unSignUp = function (uid, matchId) {
    var self = this;
    var match = self.matches[matchId];
    return match.unSignUp(uid);
};
//仅仅删除记录 通知由Match本身发
MatchManager.prototype.releaseMatch = function (matchId) {
    var match = this.matches[matchId];
    if(match === undefined){
        return;
    }
    //console.log("====MatchManager=++++=releaseMatch==>matchId: ",matchId);
    var index = this.matchType[match.type].indexOf(matchId);
    this.matchType[match.type].splice(index, 1);
    this.matches[matchId] = {};
    delete this.matches[matchId];
};


//机器人进入
MatchManager.prototype.enterRobot = function (matchId, num) {
    var match = this.matches[matchId];
    if(match === undefined){
        return;
    }
    //match.robotManager.init(num);
}

MatchManager.prototype.updateWaitTime = function (matchId, timeNum) {
    var match = this.matches[matchId];
    //console.log('=MatchManager.updateWaitTime=++++=> ', matchId, timeNum);
    if(match === undefined || timeNum == undefined){
        return;
    }
    if(timeNum *1 < 0){
        timeNum = 0;
    }
    match.broadcast(4, {time: timeNum}, null);
}
MatchManager.prototype.getMatch = function (matchId) {
    return this.matches[matchId];
}