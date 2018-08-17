/**
 * Created by Author.
 */


function nop() {
}

var REDIS_KEY_USER_INFO = "fish4user:";//用户信息记录
var REDIS_KEY_BIG_MATCH = "fish4bigMatch:";//大奖赛记录

module.exports = function (_redis) {
    redis = _redis;
    return new PlayerManager()
};

var redis;

var Player = require("./Player");

//var MAX_PLAYER_COUNT = 2000; //在压力测试前先用2000 暂不设置人数限制
//人数限制由FrontServer进行控制 SceneServer只会将目前状态同步到FrontServer

function PlayerManager() {

    this.playerList = {};
    this.cmdList = {}; //由PlayerManager处理的命令
    this.playerCount = 0;//当前玩家数量

    //============添加 cmd对应的方法
    var cmdList = this.cmdList;
    cmdList["caretePlayer"] = this.caretePlayer;
}

PlayerManager.prototype.caretePlayer = function (uid, serverId, selfRankInfo, playerData, cb) {

    var self = this;
    if (!self.playerList[uid]) {
        self.playerCount++;
    }

    self.playerList[uid] = new Player(uid, playerData, serverId, selfRankInfo, self.msgManager, self);
    // if(againCostGem > 0){
    //     self.playerList[uid].costOrAdd(2,againCostGem,0);
    // }
    cb(null, self.playerList[uid]);
};



/**
 * 处理本玩家的消息
 * @param cmd {String} 消息命令
 * @param uid {String} 玩家id
 * @param data {Array} 参数数组
 * @param cb {Function} 回调函数
 * @return {null}
 * */
PlayerManager.prototype.processMsg = function (cmd, uid, data, cb) {
    if (!data) data = [];
    if (this.cmdList[cmd]) {
        //var args = Array.apply(null, arguments).slice(1); //arguments 有可能是object
        var args = data;
        data.unshift(uid);
        data.push(cb);
        this.cmdList[cmd].apply(this, args);
        return null;
    }
    if (!this.playerList[uid]) {
        return cb();// TODO 返回一个本server中没有这个玩家的消息
    }

    var args = [cmd, data, cb];
    this.playerList[uid].processMsg.apply(this.playerList[uid], args);
};

/**
 * @return {Number} 返回当前玩家数量
 * */
PlayerManager.prototype.getPlayerCount = function () {
    return this.playerCount;
};

PlayerManager.prototype.setMsgManager = function (msgManager) {
    this.msgManager = msgManager;
};

PlayerManager.prototype.deletePlayer = function (player) {
    delete this.playerList[player.uid];
    this.playerCount--;
    //console.log('=PlayerManager deletePlayer=0000=>',this.playerCount,this.playerList)
};