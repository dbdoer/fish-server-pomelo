/*!
 * Copyright(c) 2014 jason.bin <23692515@qq.com>
 * 关于用户数据redis 操作
 * 快速赛参数机制
 */
var redisCmd = require("./redis/redisCmd");

//本文件导出
var SortFastMatch = module.exports;
/**
 *快速赛参赛人数
 */

var DBKEY = "countFastMatch";
var getType = function(id){
    return Math.floor((id % 1000) / 100);
}

SortFastMatch.incr = function (type, cb){
    redisCmd.incr(DBKEY + getType(type), function (err, reply) {
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
};

SortFastMatch.decr = function (type, cb){
    redisCmd.decr(DBKEY + getType(type), function (err, reply) {
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
};

SortFastMatch.decrby = function (type, num, cb){
    redisCmd.decrby(DBKEY + getType(type), num, function (err, reply) {
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
};

//获取
SortFastMatch.get = function (type, cb){
    redisCmd.get(DBKEY + type, function (err, reply) {
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
};


var ROBOT = "robot"
SortFastMatch.incrRobot = function (type, cb){
    redisCmd.incr(ROBOT + getType(type), function (err, reply) {
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
};

SortFastMatch.decrRobot = function (type, cb){
    redisCmd.decr(ROBOT + getType(type), function (err, reply) {
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
};

SortFastMatch.decrbyRobot = function (type, num, cb){
    redisCmd.decrby(ROBOT + getType(type), num, function (err, reply) {
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
};



//获取
SortFastMatch.get = function (type, cb){
    redisCmd.get(DBKEY + type, function (err, reply) {
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
};
