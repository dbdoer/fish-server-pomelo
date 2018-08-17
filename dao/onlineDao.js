/*!
 * Copyright(c) 2014 jason.bin <23692515@qq.com>
 *  用户保障账号唯一在线
 */
var redisCmd = require("../dao/redis/redisCmd");
var logger = require("../common/logHelper").helper;
var REDISKEY_ONLINE = 'onlineAcc:';

var OnlineDao = module.exports;
/**
 * 用户上线
 *  uid 账号信息
 *  serverid 服务器ID
 */
OnlineDao.SetOnline = function (uid,serverid){
    redisCmd.set(REDISKEY_ONLINE+uid, serverid, function(err, reply){
        if(err){
            logger.err("onlineDao SetOnline =", err);
        }
    });
};

/**
 * 用户下线
 *  uid 账号
 */
OnlineDao.DelOnline = function (uid){
    redisCmd.del(REDISKEY_ONLINE+uid, function(err, reply){
        if(err){
            logger.err("onlineDao DelOnline =", err);
        }
    });
};


/**
 * 获取用户信息
 *  uid 账号
 */
OnlineDao.GetOnline = function (uid, cb){
    redisCmd.get(REDISKEY_ONLINE+uid, function(err, reply){
        if(err){
            logger.err("onlineDao GetOnline =", err);
        }
        cb(err, reply);
    });
};
