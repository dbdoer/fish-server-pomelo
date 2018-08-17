/*!
 * Copyright(c) 2014 jason.bin <23692515@qq.com>
 * 关于用户数据redis 操作
 * 数据库交互的数据在本文件完成，数据库中数据格式不要传到外层
 * 数据库需要序列列在此处处理
 * 逻辑层交互最小单位是obj
 */
var redisCmd = require("./redis/redisCmd");
var CONST = require('../common/consts');
var DBKEY = "fish4user:";
var NAMEDBKEY = "fish4name:";
var REDIS_KEY_OUT2IN = "out2in:";

//本文件导出
var UserDao = module.exports;
/**
 * 已经存在用户写档,key values 对应
 * h_user 写档
 */
UserDao.write = function (user, cb){
    //初始化设置玩家信息保存到数据库
    var guid = user.getUid();
    var writeData = user.getData();

    redisCmd.hmset(
        DBKEY + guid,
        writeData,
        function (err, reply) {
        cb(err, reply);
    });
};
/**
 * 存储单个或多个字段的数据,key, values 的下标要一一对应
 * keys 数组类型为了修改多个key  keys = ["name","gold",..]
 * values 数组类型为了修改多个values  values = ["aaaa",100,..]
 */
UserDao.writeByKeysAndValues = function (guid, keys, values, cb){
    if(guid == undefined || keys == undefined || values == undefined){
        cb(100, null);return;
    }
    if(keys instanceof Array != true|| values instanceof Array != true){
        cb(101, null);return;
    }
    if(keys.length != values.length){
        cb(102, null);return;
    }
    var tempInfo = {};
    for(var k = 0; k < keys.length; k++){
        if (keys[k] == undefined || typeof(keys[k]) == "function" ||
            values[k] == undefined || typeof(values[k]) == "function"){
            continue;
        }
        /// 如果参数数数组或对象,则需转成字符串
        if(typeof (values[k]) == "object" || values[k] instanceof Array == true){
            values[k] = JSON.stringify(values[k]);
        }
        tempInfo[keys[k]] = values[k];
    }
    //初始化设置玩家信息保存到数据库
    redisCmd.hmset(
        DBKEY + guid,
        tempInfo,
        function (err, reply) {
            cb(err, reply);
        });
};
UserDao.GmWrite = function (uid,data,cb){
    if(uid == undefined || data == undefined){
        cb(1, null); return;
    }
    //初始化设置玩家信息保存到数据库
    var guid = uid;
    var writeData = {
        "endTime" :data.endTime,
        "blockingContent" :data.blockingContent,
        "unblockingContent" :data.unblockingContent
    }

    redisCmd.hmset(
        DBKEY + guid,
        writeData,
        function (err, reply) {
            cb(err, reply);
        });
};


//// 根据昵称进行数据库读档操作
UserDao.loadByName = function(value, cb){
    if(value == undefined){
        cb(1, null);
        return;
    }
    var newStr = '';
    for (var i = 0; i < value.length; i++) {
        newStr += '\\u' + value.charCodeAt(i).toString(16);
    }
    //console.log('==UserDao.loadByName==>newStr: ',value,newStr)
    var cmd = NAMEDBKEY + newStr;
    redisCmd.get(cmd, function (err, reply) {
        //console.log('==UserDao.loadByName==>err, reply: ',err, reply)
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
}
//// 根据玩家显示ID进行数据库读档操作
UserDao.loadByShowId = function(value, cb){
    if(value == undefined){
        cb(1, null);
        return;
    }

    var cmd = REDIS_KEY_OUT2IN + value;
    redisCmd.get(cmd, function (err, reply) {
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
}

//// 根据Uid进行数据库读档操作
UserDao.loadByGuid = function(guid, cb){
    
    var cmd = DBKEY + guid;
    redisCmd.hgetall(cmd, function (err, reply) {
        if (err || !reply || Object.keys(reply).length <= 0) {
            cb(err, null);
            return;
        }

        cb(null, reply);
    });
}
/**
 *用户读档, 读档成功后生obj user 对象
 */
UserDao.load = function (user, cb){

    var uid    = user.getUid();
    var cmd     = DBKEY + uid;
    redisCmd.hgetall(cmd, function (err, reply) {
        if (err) {
            cb(err, null);
            return;
        }
        if (!reply) {
            //这种情况是数据中没有该user,可能是个新用户
            cb(err,  null);
            return;
        }
        //console.log("-----------------------------reply==>: ",reply);
        user.fromDB(reply);
        cb(null, {});
    });
}

