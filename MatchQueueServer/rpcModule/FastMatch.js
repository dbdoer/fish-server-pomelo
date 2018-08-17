/**
 * Created by 李峥 on 2016/4/20.
 * 人满就进的快速比赛
 * 不进行排队 只保存各FastMatchServer的比赛信息
 *
 * matchId-->{
 *      current  = currentPlayerCount,
 *      total    = totalPlayerCount,
 *      serverId = serverId
 * }
 *
 * serverId --> {
 *      currentPlayerCount:x
 * }
 */

function nop() {
}

var async = require('async');
var logger = require("../../common/logHelper").helper;

module.exports = FastMatch;

/**
 * 创建match的规则 只要对应的比赛被消费掉就立刻创建新的 但是首次创建需要由用户报名触发
 * */
function FastMatch(rpcServer, rpcManager) {

    this.rpcServer = rpcServer;
    this.rpcManager = rpcManager;

    this.matchCounter = 0;//比赛计数器
    this.servers = {}; //FastMatchServer列表
    this.matches = {}; //比赛列表
    this.currentQueue = {}; //当前正在等待的房间
    this.matchStatistics = {};//人数统计
    this.waitQueue = {};//等待队列
    this.waitFlags = {};//等待标志

    this.selectRobotInfo = {}; //选中的机器人
    this.addRobotTimer = null;
    this.waitTimeOfMatch = {};
    this.initRegister();
}

FastMatch.prototype.initRegister = function () {
    var self = this;
    //for FrontServer
    this.rpcServer.registerRemoteFunc('getFastMatchInfo', function (cb) {
        self.getMatchInfo(cb);
    });
    this.rpcServer.registerRemoteFunc('signUp', function (uid, fServer, type, cb) {
        self.getAvailableMatch(uid, fServer, type, cb);
    });

    //for FastMatchServer
    //this.rpcServer.registerRemoteFunc('startMatch', function (serverId, matchId) {
    //    self.startMatch(serverId, matchId);
    //});

    this.rpcServer.registerRemoteFunc('closeMatch', function ( matchId) {
        self.closeMatch(matchId);
    });
    this.rpcServer.registerRemoteFunc('againEnterMatch', function (uid, fServer, cb) {
        self.againEnterMatch(uid, fServer, cb);
    });
    this.rpcServer.registerRemoteFunc('leaveMatch', function (matchId) {
        self.leaveMatch(matchId);
    });

    this.waitTimer = setInterval(function () {
        //console.log('Match ==> self.timer: ',self.timeCounter);
        self.everySecondMatchWaitTime();
    }, 1000);
};

/**
 * 获取一个可用的比赛
 * 同时仅维持一个可进入的比赛
 * 实际上就是报名
 * 返回FrontServer后需要在FrontServer上向对应的FastMatchServer调用join
 * type 比赛类型 2人 4人 8人赛
 * */
FastMatch.prototype.getAvailableMatch = function (uid, fServerId, type, cb) {
    var self = this;

    //指定的比赛不存在则创建
    if (!self.currentQueue[type]) {
        if (!self.waitQueue[type]) {
            self.waitQueue[type] = [];
        }

        self.waitQueue[type].push([uid, fServerId, cb]);
        if (!self.waitFlags[type]) {
            self.createNewMatch(type, nop);
        }
        return;
    }

    /**
     * 机器人进入
     */
    var msgEnterRobot = function (match, num, fm) {
        var rpc = fm.rpcManager.getRpcByServerId(match.serverId);
        if (!rpc) {
            logger.err('msgEnterRobot: failed to get rpcServer. Id:' +match.serverId);
            return;
        }
        var rpcFunc = rpc.getMethod('enterRobot');//报名
        rpcFunc(match.matchId, num, function (err){
            logger.debug('getAvailableMatch  msgEnterRobot matchId = ' + match.matchId+', num = ' + num);
            self.startMatch(match.serverId, match.matchId);
        });
    }



    //rpc 报名
    var match = self.matches[self.currentQueue[type]];
    //console.log('-----------------match.serverId',match.serverId);
    var rpc = self.rpcManager.getRpcByServerId(match.serverId);
    if (rpc) {
        logger.debug('getAvailableMatch signup before, server=' + fServerId+' uid=' + uid+' matchId=' + match.matchId);
        var signUp = rpc.getMethod('signUp');//报名
        signUp(uid, fServerId, match.matchId, function (err) {
            match.current++;

            /*//第一个加入创建倒计时事件, 10s后机器人进入
            if(match.current == 1){
                self.addRobotTimer = setTimeout(function () {
                    match.robotTotal = match.total-match.current;
                    msgEnterRobot(match, match.robotTotal, self);
                },  10*1000);
            }*/
            if(match.current == 1){
                self.waitTimeOfMatch[type] = {matchId: match.matchId, time: 60};
            }
            if(match.current >= match.total){
                self.startMatch(match.serverId, match.matchId);
            }
            logger.debug('getAvailableMatch signup later, serverId=' + match.serverId +", current= "+ match.current);
            cb(err, match.serverId, match.matchId, self.waitTimeOfMatch[type].time);
        });
        return;
    }

    logger.err('=getAvailableMatch=++++=>rpc == null, Id:' +match.serverId);
    self.waitQueue[type].push([uid, fServerId, cb]);
    self.currentQueue[type] = null;
    self.createNewMatch(type, nop);
};
/// 每秒钟更新玩家等待开始比赛的时间 *临时方案*
FastMatch.prototype.everySecondMatchWaitTime = function (){
    if(this.waitTimeOfMatch == undefined || Object.keys(this.waitTimeOfMatch).length <= 0){
        return;
    }

    var self = this;
    for(var wKey in self.waitTimeOfMatch){
        var tempWaitTime = self.waitTimeOfMatch[wKey];
        if(tempWaitTime == undefined){ continue; }

        if(self.currentQueue[wKey] == undefined || self.currentQueue[wKey] == null) {
            continue;
        }
        tempWaitTime.time = tempWaitTime.time *1 -1;
        self.waitTimeOfMatch[wKey] = tempWaitTime;
        if(tempWaitTime.time <= 10){
            //// 开始于前端同步时间
            var match = self.matches[self.currentQueue[wKey]];
            var rpc = self.rpcManager.getRpcByServerId(match.serverId);
            if (rpc) {
                //console.log('=getMethod.updateWaitTime=++++=>type == ', tempWaitTime.time);
                var signUp = rpc.getMethod('updateWaitTime');//// 等待时间同步
                signUp(tempWaitTime.matchId, tempWaitTime.time, function () {
                })
            }

            // TODO: 如何做异常处理 by wdl (2017.06.16)
            logger.err('FastMatch.everySecondMatchWaitTime: failed to get rpcServer. Id:' +match.serverId);

            if(tempWaitTime.time <= 0){
                delete self.waitTimeOfMatch[wKey];
                self.waitQueue[wKey] = false;
                self.currentQueue[wKey] = null;
            }
        }
    }
};

/**
 * 创建一场新的比赛
 * */
FastMatch.prototype.createNewMatch = function (type, cb) {
    var self = this;
    var current = -1;
    var id = -1;
    //console.log('start find server');
    for (var serverId in this.servers) {
        //console.log('server ===> ' + serverId);
        logger.info('createNewMatch server ===> ' + serverId);
        var server = this.servers[serverId];
        if (current < 0 || current > server.currentPlayer) {
            current = server.currentPlayer;
            id = serverId;
        }
    }
    logger.debug('createNewMatch before, serverId=' + id +", current= " +current);
    if (id < 0) {
        logger.err('ERR: start find server id < 0 ,this.servers: ' + this.servers);
        //TODO 没找到服务器
        return;
    }
    //console.log('after find server');
    //var nowTime = new Date();
    //if(nowTime.getHours() >= parseMatchType(type).competition_starttime && nowTime.getHours() <parseMatchType(type).competition_endTime) {
        self.waitFlags[type] = true; //等待标志 等待时所有请求的新人
        var rpc = this.rpcManager.getRpcByServerId(id);
        if (rpc) {
            var creator = rpc.getMethod('createMatch');
            var matchId = this.createMatchId();
            creator(matchId, type, id, function (err) {

                //console.log('start create match =======>',matchId);
                var match = {
                    matchId: matchId,
                    serverId: id,
                    current: 0,
                    type: type,
                    total: parseMatchType(type).competition_playerlimit
                };
                self.matches[matchId] = match;
                self.waitFlags[type] = false;
                self.currentQueue[type] = matchId;

                self.matchCounter++; //计数加1
                for (var i = 0; i < match.total; i++) {
                    //会有可能造成没排上的情况 没排上.....从头排
                    var player = self.waitQueue[type].shift();
                    if (!player || player === undefined)
                        return;//空了提前结束
                    self.getAvailableMatch(player[0], player[1], type, player[2]);
                }

                logger.debug('createNewMatch later, matchId= ' + matchId);
                //console.log('after create match');
            });
        } else {
            //TODO 服务器跪了之后删除错误服务器 重新调用本函数
            //delete this.servers[id];
            //this.createNewMatch(type, cb);
            logger.err('createNewMatch can not connect to fast match server:' +id);
        }
};
/**
 * 重新进入比赛
 * */
FastMatch.prototype.againEnterMatch = function (uid, fServer, cb){
    var fastRpc = this.rpcManager.getRpcByRType("FastMatchServer");
    if (!fastRpc) {
        logger.err('e1FastMatch --- againEnterMatch = ' + uid);
        cb(null);
        return;
    }

    var fInspection = fastRpc.getMethod('inspection');//检查是否已经在比赛
    if(!fInspection ){
        logger.err('e2 FastMatch --- againEnterMatch = ' + uid);
        cb(null);
        return;
    }

    logger.debug("FastMatch --OK- againEnterMatch uid= " + uid);
    fInspection(uid, function(result) {
       //console.log('cb FastMatch [%s] =%s ' , uid, JSON.stringify(result));
        cb(result);
    });
};

/**
 * 退出进入比赛
 * */
FastMatch.prototype.leaveMatch = function (matchId){
    var match = this.matches[matchId];
    match.current--
    if(match &&  match.current <= 0){
        match.current = 0;
        if(this.addRobotTimer != undefined ||
            this.addRobotTimer != null){
            clearTimeout(this.addRobotTimer);
        }
    }
};
/**
 * 比赛开始
 * 比赛开始后不再接受报名
 * */
FastMatch.prototype.startMatch = function (serverId, matchId) {
    var match = this.matches[matchId];
    var info = parseMatchType(match.type);
    if (!this.matchStatistics[match.type]) {
        this.matchStatistics[match.type] = 0;
    }
    this.matchStatistics[match.type] += info.competition_playerlimit;

    this.currentQueue[match.type] = null;
    //this.createNewMatch(match.type, nop);
};

/**
 * 比赛结束
 * */
FastMatch.prototype.closeMatch = function (matchId) {
    var match = this.matches[matchId];
    if(match === undefined){
        console.log('=FastMatch CloseMatch==> match === undefined');
        return;
    }
    //console.log('=FastMatch CloseMatch==> match =',match.matchId, matchId);
    var info = parseMatchType(match.type);
    //var server = this.servers[serverId];
    //server.currentPlayerCount -= info.competition_playerlimit;
    this.matchStatistics[match.type] -= info.competition_playerlimit;
    this.matches[match.matchId] = null;
    delete this.matches[match.matchId];
    delete this.selectRobotInfo[match.matchId];
    delete this.currentQueue[match.type];
    delete this.waitQueue[match.type];
};

/**
 * 获取MatchInfo
 * 统计所有FastMatchServer中的所有类型比赛
 * {
 *      type1:playerCount1,
 *      type2:playerCount2,
 *      type3:playerCount3
 * }
 * */
FastMatch.prototype.getMatchInfo = function (cb) {
    cb(this.matchStatistics);
};

FastMatch.prototype.createMatchId = function () {
    return Date.now();
};

FastMatch.prototype.addServer = function (serverId) {
    this.servers[serverId] = {currentPlayer: 0};
};

FastMatch.prototype.removeServer = function (serverId) {
    //TODO 删除对应server中的match
    delete this.servers[serverId];
};


/**
 * 根据传入的type返回该type的人数及报名费
 * */
function parseMatchType(matchId) {
    //return global.matchTable.fastMatch[type];
    return global.compConfig[matchId];
}