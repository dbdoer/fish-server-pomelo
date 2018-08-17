"use strict";
/**
 * Created by 李峥 on 2016/3/17.
 * 通信管理模块
 * 管理进出通信
 * 传入消息不做缓存 即时处理
 * rpc发出消息进行缓存 每50ms发送一次
 * msgDispatcher 就是player manager
 */
var logger = require("./logHelper").helper;

function nop() {
}

var PROCESS_MSG_OUT_INTERVAL = 50; // 处理发出消息的间隔
var MAX_MSG_BUFFER = 2000;//缓存的要送出消息的条数上限

/**
 * @param rpcManager {RpcManager} rpc管理
 * @param rpcServer {RpcServer}
 * @param msgDispatcher{object} 消息分发
 * */
function MsgManager(rpcManager, rpcServer, msgDispatcher) {
    this.msgOut = {}; //根据不同的server缓存
    this.rpcManager = rpcManager;
    this.rpcServer = rpcServer;
    this.msgDispatcher = msgDispatcher;     //msgDispatcher实际上是playerManager
    this.msgDispatcher.setMsgManager(this);
    this.isSendingMsg = false; //是否正在处理送出的消息
    this.isSendingRpc = false; //是否正在处理送出的rpc
    this.msgCount = 0;//要送出的msg计数a

    this.cmdList = {};//在MsgManager中处理的消息

    this.rpcOut = {};
    this.rpcCount = 0;
}

/**
 * 开始msg处理
 * */
MsgManager.prototype.start = function () {
    //开始计时任务
    var self = this;

    function outTask() {
        //正在处理则跳过一次
        if (!self.isSendingMsg)
            self.sendMsgOut();
        setTimeout(outTask, PROCESS_MSG_OUT_INTERVAL);
    }

    function rpcTask() {
        //正在处rpcTask理则跳过一次
        if (!self.isSendingRpc)
            self.sendRpcOut();
        setTimeout(rpcTask, PROCESS_MSG_OUT_INTERVAL);
    }

    outTask();
    rpcTask();
};


/**
 * 接收FrontServer传来的数据 仅用来处理玩家调用 server级消息使用具体的rpc方法
 * @param {String} cmd 消息调用的具体方法
 * @param {String} uid 消息对应的玩家user id
 * @param {Array} data 消息的数据(参数数组)
 * @param {Function} cb 回调 可以为空
 * @return {null}
 * */
MsgManager.prototype.msgPacketTrans = function (cmd, uid, data, cb) {
    //logger.info("MsgManager.msgPacketTrans: entered.");
    if (!cb)
        cb = nop;
    if (!this.cmdList[cmd]) {
        this.msgDispatcher.processMsg(cmd, uid, data, cb);
    } else {
        
    }
};

MsgManager.prototype.addMsgOut = function (serverId, msg) {
    if (!this.msgOut[serverId]) {
        this.msgOut[serverId] = [];
    }
    this.msgOut[serverId].push(msg);
    if (++this.msgCount >= MAX_MSG_BUFFER) {
        //达到或超过上限立刻送出
        this.sendMsgOut();
    }
};

MsgManager.prototype.sendMsgOut = function () {
    this.isSendingMsg = true;
    var cloneMsg = this.msgOut;
    var self = this;
    var tempQueue = {};

    //通过rpc进行发送
    for (var serverId in cloneMsg) {
        var msgQ = cloneMsg[serverId];
        var rpc = this.rpcManager.getRpcByServerId(serverId);
        if (!rpc) {
            logger.err('MsgManager.sendMsgOut: error to getRpcByServerId: ' +serverId);
            continue;
        }
        var func = rpc.getMethod("push2client");
        if (func) {
            //uid pid pName data
            //console.log("--------------msgQ", msgQ);
            for (var i = 0; i < msgQ.length; i++) {
                var m = msgQ[i];
                func(m[0], m[1], m[2], m[3], function(err, ret){
                    //发送消息给指定的UID，失败删除用户
                    if(err){
                        logger.err('MsgManager.sendMsgOut: push2client error: ', err);
                        //错误消息处理机制
                        self.msgDispatcher.processMsg('error', m[0], [], function(){})
                    }
                });
                this.msgCount--;//消息减少
            }
        } else {
            logger.err('MsgManager.sendMsgOut: error to getMethod(push2client)');
            // rpc中断 没发送的消息再存回去 rpc可能还会重新连接上(FrontServer跪了之后也许会重新上线)
            tempQueue[serverId] = cloneMsg[serverId];
        }
    }

    this.msgOut = tempQueue; //清空对象
    this.isSendingMsg = false;
};

MsgManager.prototype.addRpcOut = function (serverId, msg) {//serverId = fServerId,msg = [1, this.uid, {uid: player.uid}]
    if (!this.rpcOut[serverId]) {
        this.rpcOut[serverId] = [];
    }
   
    this.rpcOut[serverId].push(msg);
    if (++this.rpcCount >= MAX_MSG_BUFFER) {
        //达到或超过上限立刻送出
        this.sendRpcOut();
    }
}

MsgManager.prototype.sendRpcOut = function () {
    this.isSendingRpc = true;
    var cloneMsg = this.rpcOut;
    var self = this;
    var tempQueue = {};

    //通过rpc进行发送
    for (var serverId in cloneMsg) {
        var msgQ = cloneMsg[serverId];
        var rpc = this.rpcManager.getRpcByServerId(serverId);
        if (!rpc) {
            logger.err('MsgManager.sendRpcOut: error to getRpcByServerId: ' +serverId);
            continue;
        }
        var func = rpc.getMethod("rpc_handler");
        if (func) {
            //uid pid pName data
            for (var i = 0; i < msgQ.length; i++) {
                var m = msgQ[i];
                func(m[0], m[1], m[2], function(err, ret){
                    //发送消息给指定的UID，失败删除用户
                    if(err){
                        logger.err("MsgManager.sendRpcOut: rpc_handler error:", err);
                        //错误消息处理机制
                        self.msgDispatcher.processMsg('error', m[0], [], function(){})
                    }
                });
                this.rpcCount--;//消息减少
            }
        } else {
            logger.err('MsgManager.sendMsgOut: error to getMethod(rpc_handler)');
            // rpc中断 没发送的消息再存回去 rpc可能还会重新连接上(FrontServer跪了之后也许会重新上线)
            tempQueue[serverId] = cloneMsg[serverId];
        }
    }

    this.rpcOut = tempQueue; //清空对象
    this.isSendingRpc = false;
};

module.exports = function (rpcManager, rpcServer, msgDispatcher) {
    return new MsgManager(rpcManager, rpcServer, msgDispatcher);
};