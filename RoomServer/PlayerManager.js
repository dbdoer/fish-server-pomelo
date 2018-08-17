"use strict";
/**
 * Created by 李峥 on 2016/3/17.
 * player管理类
 * 负责player的添加 移除
 * 负责分发FrontServer传来的消息
 */

var logger = require("../common/logHelper").helper;

function nop() {
}

var REDIS_KEY_USER_INFO = "fish4user:";//用户信息记录

module.exports = function (rm, _redis) {
    redis = _redis;
    return new PlayerManager(rm)
};

var redis;

var Player = require("./Player");

//var MAX_PLAYER_COUNT = 2000; //在压力测试前先用2000 暂不设置人数限制
//人数限制由FrontServer进行控制 SceneServer只会将目前状态同步到FrontServer

function PlayerManager(roomManager) {

    this.playerList = {};
    this.cmdList = {}; //由PlayerManager处理的命令
    this.playerCount = 0;//当前玩家数量
    this.roomManager = roomManager;
    this.roomManager.setPlayerManager(this);

    //============添加 cmd对应的方法
    var cmdList = this.cmdList;
    cmdList["addPlayer"] = this.addPlayer;
}

PlayerManager.prototype.addPlayer = function (uid, serverId, data, cb) {
    if (!this.playerList[uid]) {
        this.playerCount++;
    }
    var self = this;
    self.playerList[uid] = new Player(uid, data, serverId, self.roomManager, self.msgManager, self);
    cb(null, "remote success");

};


/**
 * 处理本玩家的消息
 * 1 处理cmd list 消息
 * 2 玩家消息
 * @param cmd {String} 消息命令
 * @param uid {String} 玩家id
 * @param data {Array} 参数数组
 * @param cb {Function} 回调函数
 * @return {null}
 * */
PlayerManager.prototype.processMsg = function (cmd, uid, data, cb) {
    //console.log("RoomServer.PlayerManager.processMsg: entered. cmd=%s, uid=%s, data=%s", cmd, uid, JSON.stringify(data));

    //处理cmd list 消息
    //这里处理的是ROOM收到的消息
    if (!data)
        data = [];
    if (this.cmdList[cmd]) {
        //var args = Array.apply(null, arguments).slice(1); //arguments 有可能是object
        var args = data;
        data.unshift(uid);
        data.push(cb);
        this.cmdList[cmd].apply(this, args);
        return null;
    }

    //这里是player 处理消息
    if (!this.playerList[uid]) {
        return cb('cannot find the player');// TODO 返回一个本server中没有这个玩家的消息
    }
    //处理具体玩家消息
    var args = [cmd, data, cb];
    this.playerList[uid].processMsg.apply(this.playerList[uid], args);
    //console.log("PlayerManager.processMsg: leaved.");
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
    //console.log('=PlayerManager deletePlayer=0000=>',this.playerCount,this.playerList);
};