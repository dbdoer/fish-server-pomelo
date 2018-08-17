/*
 * 关于好友数据redis 操作
 * 数据库交互的数据在本文件完成，数据库中数据格式不要传到外层
 * 数据库需要序列列在此处处理
 * 逻辑层交互最小单位是obj
 */
var redisCmd = require("./redis/redisCmd");
var CONST = require('../common/consts');
var DBKEY = "fish4gift:";

//本文件导出
var GiftDao = module.exports;
/**
 * 已经存在用户写档,key values 对应
 * h_user 写档
 */
GiftDao.write = function (user, cb){
    //初始化设置玩家信息保存到数据库
    var guid = user.getUid();
    var mng = user.contMng;
    var writeData = mng.gift.writeDataToRedis();
    redisCmd.hmset(
        DBKEY + guid,
        writeData,
        function (err, reply) {
            cb(err, reply);
        });
};
/**
 * @param guid
 * @param GiftInfo
 */
GiftDao.writeByUid = function (uid, GiftInfo, cb){
    if(uid == undefined || GiftInfo == undefined){
        cb(1 , null);
        return;
    }

    var tempData = {};
    for(var key in GiftInfo){
        tempData[key] = JSON.stringify(GiftInfo[key]);
    }
    redisCmd.hmset(
        DBKEY + uid,
        tempData,
        function (err, reply) {
            cb(err, reply);
        }
    );
};
/**
 *用户读档, 读档成功后生obj gift 对象
 */
GiftDao.load = function (user, cb){

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
        user.contMng.gift.fromDb(reply);
        cb(null, {});
    });
}
/**
 * @param guid
 */
GiftDao.loadByGuid = function (guid, cb){
    if(guid == undefined){
        cb(1, null);
        return;
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
/**
 *删除指定OBJ
 */
GiftDao.deleteByUid = function (selfUid, key, cb){
    if(selfUid == undefined || key == undefined){
        cb(1, null);
        return;
    }
    var cmd  = DBKEY + selfUid;
    redisCmd.hdel(cmd, key, function (err, reply) {
        cb(err, reply);
    });
}
