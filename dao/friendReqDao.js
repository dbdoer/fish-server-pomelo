/*
 * 关于好友请求数据redis 操作
 * 数据库交互的数据在本文件完成，数据库中数据格式不要传到外层
 * 数据库需要序列列在此处处理
 * 逻辑层交互最小单位是obj
 */
var redisCmd = require("./redis/redisCmd");
var CONST = require('../common/consts');
var DBKEY = "friendReq:";

//本文件导出
var FriendReqDao = module.exports;
/**
 * 已经存在用户写档,key values 对应
 * h_user 写档
 */
FriendReqDao.write = function (user, cb){
    //初始化设置玩家信息保存到数据库
    var guid = user.getUid();
    var mng = user.contMng;
    var writeData = mng.friendReq.writeDataToDb();

    redisCmd.hmset(
        DBKEY + guid,
        writeData,
        function (err, reply) {
        cb(err, reply);
    });
};
/**
 * @param guid
 * @param writeData 对象类型
 */
FriendReqDao.writeByGuid = function (guid, writeData, cb){
    if(guid == undefined || writeData == undefined){
        cb(1, null);
        return;
    }
    var tempData = {}
    for(var key in writeData){
        tempData[key] = JSON.stringify(writeData[key]);
    }
    redisCmd.hmset(
        DBKEY + guid,
        tempData,
        function (err, reply) {
            cb(err, reply);
        }
    );
};
/**
 *用户读档, 读档成功后生obj friend 对象
 */
FriendReqDao.load = function (user, cb){

    var uid    = user.getUid();
    var cmd     = DBKEY + uid;
    redisCmd.hgetall(cmd, function (err, reply) {
        if (err) {
            cb(err, null);
            return;
        }
        if (!reply) {
            cb(err,  null);
            return;
        }

        user.contMng.friendReq.fromDb(reply);
        cb(null, {});
    });
}
/**
 * @param guid
 */
FriendReqDao.loadByGuid = function (guid, cb){
    if(guid == undefined){
        cb(1, null);return;
    }
    var cmd     = DBKEY + guid;
    redisCmd.hgetall(cmd, function (err, reply) {
        if (err) {
            cb(err, null);
            return;
        }
        if (!reply) {
            cb(err,  null);
            return;
        }
        var objInfo = {};
        for(var k in reply){
            var _db = JSON.parse(reply[k]);
            objInfo[k] = _db;
        }
        cb(null, objInfo);
    });
}

FriendReqDao.deleteByGuid = function (user, delGuid, cb) {
    if(user == undefined || delGuid == undefined){
        cb(1, null);
        return;
    }
    var uid    =  user.getUid();
    var cmd     = DBKEY + uid;
    redisCmd.hdel(cmd,
        delGuid,
        function (err, reply) {
            cb(err, reply);
        }
    );
}

FriendReqDao.deleteAllByGuid = function (guid, cb) {
    if(guid == undefined){
        cb(1, null);
        return;
    }

    var cmd = DBKEY + guid;
    redisCmd.del(cmd,
        function (err, reply) {
            cb(err, reply);
        }
    );
}
