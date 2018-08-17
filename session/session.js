/**
 * Created by ck01-441 on 2016/2/26.
 * session管理
 * 管理session信息
 * --连接redis
 * --生成唯一的sessionID
 * --超时管理
 * --在session中添加field存储临时信息
 * --当conn链接断线时通知相关服务器
 * session只在FRONT SERVER中存在
 * TODO 负责db操作 逻辑中尽可能不出现直接操作db
 */

//var ObjUser = require("../obj/objUser");
//var bagDao = require("../dao/bagDao");
var nop = function () {
};//回调啥都不做

//var redis; //redis集群的客户端

var redis = require("../dao/redis/redisCmd")
var rpcManager;
var uuid = require("uuid");

var REDIS_KEY = "new_fish_session:";
const EXPIRE_TIME = 3600 * 1000; //过期时间为3600s

var currentServerId;//当前serverID

var sessionList = {};
var uidTable = {};//保存uid->sid 用于转发其他服务器推送消息时索引conn
var sidTable = {};

var listUserOnline = {};  //在线用户信息列表

var onDeleteExec = {};//保存当删除session时执行的方法

function init(rpc) {
    rpcManager = rpc;
}

function newSession(conn) {
    var sid = currentServerId + "*" + uuid.v1();
    conn._sid = sid;
    var retryCount = 0;
    conn._field = {};//增加一个obj 用于存储线上需要的临时数据
    conn._timeout = setTimeout(function () {
        deleteSession(sid);
    }, EXPIRE_TIME);
    sessionList[sid] = conn;
}

function resetExpire(sid) {
    var conn = sessionList[sid];
    if(conn == undefined || conn == null){
        logger.err('=====>resetExpire conn == undefined');
        return;
    }
    clearTimeout(conn._timeout);
    conn._timeout = setTimeout(function () {
        deleteSession(sid);
    }, EXPIRE_TIME);
}



function deleteSessionByUid(uid) {
    deleteSession(uidTable[uid]);
}
function deleteSession(sid) {
    var uid = sidTable[sid];
    var user = listUserOnline[uid];
    if(user){
        user.release();
    }

    if (sessionList[sid]) {
        //执行 并清空
        if (onDeleteExec[sid]) {
            var exec = onDeleteExec[sid];
            for (var k in exec) {
                if (typeof(exec[k]) == 'function')
                    exec[k]();
            }
        }
        onDeleteExec[sid] = {};


        delete sidTable[sid];
        delete uidTable[uid];
        delete sessionList[sid];
        delete listUserOnline[uid];
    }
    redis.del(REDIS_KEY + sid);
}

function pushMsg2uid(uid, pid, pName, data, cb) {
    if(pid != 4222
        && pid != 4207
        && pid != 4208
        && pid != 4209
        && pid != 4210
        && pid != 4211
        && pid != 4208
        && pid != 4268
        && pid != 4809
        ){
        //console.log("uid[%s], pid[%s], pname[%s], data[%s]", uid, pid, pName, JSON.stringify(data));
    }

    if (!uidTable[uid]){
        console.log("error uid[%s], pid[%s], pname[%s], data[%s]", uid, pid, pName, JSON.stringify(data));
        cb("NoUid");
        return;
    }

    pushMsg2local(uidTable[uid], pid, pName, data, cb);
}

var logger = require("../common/logHelper").helper;
function pushMsg2local(sid, packetId, packetName, input, cb) {

    var conn = sessionList[sid];
    var data = require("../FrontServer/MsgParser.js").buildProtoMsg(packetId, packetName, input);
    if(conn && data){
        conn.write(data);
    }

    var uid = sidTable[sid];
    var user = listUserOnline[uid];
    if(user){
        user.countData(data.length);
    }

    //logger.info('PACKET=' + packetId +' ' + packetName + '  '+JSON.stringify(input));
    //cb('sid = '+ sid + 'PACKET=' + packetId + ' packetName' + packetName);
}
//
//function pushMsg2sid(sid, packetId, packetName, data, cb) {
//    var connectorId = getConnectorBySid(sid);
//    if (connectorId === currentServerId) {
//        pushMsg2local(sid, packetId, packetName, data, cb);
//    } else {
//        //通过rpc远程调用connector进行push
//        var rpc = rpcManager.getRpcByServerId(connectorId);
//        rpc.getMethod("pushMsg2local")(sid, packetId, packetName, data, cb);
//    }
//}

function getConnectorBySid(sid) {
    return sid.split("*")[0];
}

function close() {
}

function set(sid, key, value) {
    sessionList[sid]._field[key] = value;
}

function get(sid, key) {
    return sessionList[sid]._field[key];
}

function setUid(sid, uid) {
    uidTable[uid] = sid;
    sidTable[sid] = uid;
    if(sessionList[sid] != undefined){
        sessionList[sid]["_uid"] = uid;
    }else{
        return false;
    }
    return true;
}

function getSession(sid) {
    return sessionList[sid];
}

function getRpcManager() {
    return rpcManager;
}
function kickoff(sid) {
}

function getSessionByUid(uid) {
    var userLists = [];
    for(var key in sessionList){
        if(sessionList[key]._uid == uid){
            userLists.push(sessionList[key]);
        }
    }
    return userLists;
}
/**
 * 心跳超时删除session时会进行的操作
 * @param sid{string} session id
 * @param exec{function} 要执行的方法
 * @return{number|null} 一个指向exec的常数 要移除exec需要这个常数(句柄)
 * */
function addOnDeleteSession(sid, exec) {
    if (!sessionList[sid])return null;
    if (!onDeleteExec[sid]) {
        onDeleteExec[sid] = {};
    }
    var handle = Date.now();
    onDeleteExec[sid][handle] = exec;
    return handle;
}

function removeExecOnDeleteSession(sid, handle) {
    if (!onDeleteExec[sid])return;
    delete onDeleteExec[sid][handle];
}

//根据指定的sid 绑定user 信息
function setUser(uid, user) {
    listUserOnline[uid] = user;
    return true;
}

//根据指定的sid 得到user 信息
function getUser(uid) {
    return listUserOnline[uid];
}
function broadcastMsg(id, msg) {
    for(var k in listUserOnline){
        var _user = listUserOnline[k];
        _user.sendMsg(id, msg);
    }
}


/*function loadUser(uid, cb) {
    var user = new ObjUser();
    user.setUid(uid);
    user.loadFromDb(function(err, info){
        bagDao.load(user, function (err, res) {
            cb(user);
        });
    })
}*/


module.exports = {
    newSession: newSession,
    resetExpire: resetExpire,
    deleteSession: deleteSession,
    init: init,
    close: close,
    pushMsg2uid: pushMsg2uid,
    //pushMsg2sid: pushMsg2sid,
    pushMsg2local: pushMsg2local,
    set: set,
    get: get,
    setUid: setUid,
    getSession: getSession,
    kickoff: kickoff,
    addOnDeleteSession: addOnDeleteSession,
    removeExecOnDeleteSession: removeExecOnDeleteSession
    ,setUser: setUser
    ,getUser: getUser
    ,broadcastMsg: broadcastMsg
    ,getUserList: listUserOnline
    ,getRpcManager: getRpcManager
    ,deleteSessionByUid:deleteSessionByUid
    ,getSessionByUid:getSessionByUid
    //,loadUser: loadUser
};