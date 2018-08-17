/*!
 * Copyright(c) 2014 jason.bin <23692515@qq.com>
 * 关于用户数据redis 操作
 *
 */
var redisCmd = require("./redis/redisCmd");

//本文件导出
var CountUserRoom = module.exports;
/**
 *经典赛参赛人数
 */

var DBKEY = "countRoom";

//1110101


var getType = function(id){
    return id % 10;
}

CountUserRoom.incr = function (type, cb){
    redisCmd.incr(DBKEY + getType(type), function (err, reply) {
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
};

CountUserRoom.decr = function (type, cb){
    redisCmd.decr(DBKEY + getType(type), function (err, reply) {
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
};

CountUserRoom.decrby = function (type, num, cb){
    redisCmd.decrby(DBKEY + getType(type), num, function (err, reply) {
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
};

//获取
CountUserRoom.get = function (type, cb){
    redisCmd.get(DBKEY + type, function (err, reply) {
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
};
