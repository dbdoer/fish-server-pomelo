/*!
 * Copyright(c) 2014 jason.bin <23692515@qq.com>
 *     redis 数据倒入到mysql， 缓存机制
 */
var redisCmd = require("../dao/redis/redisCmd");
var COMM = require("../common/commons");
var logger = require("../common/logHelper").helper;
var REDISKEY_LOGIN = 'listLogin';
var REDISKEY_LOGOUT = 'listLogout';
var REDISKEY_USERINFO = 'listUserInfo';
var REDISKEY_USERINFOUPDATE = 'listUserInfoUpdate';
var REDISKEY_REDEEMCODE = 'listRedeemCodeUpdate';
var REDISKEY_RECHARGE = 'listRecharge'
var REDISKEY_USERGOLDCHANGE = 'listUserGoldChange'
var REDISKEY_USERGOLDCHANGEUPDATE = 'listUserGoldChangeUpdate'
var REDISKEY_GOODSINFO = 'listGoodsInfo';
var REDISKEY_RECHARGE2 = 'listRecharge2'
var REDISKEY_RECHARGE_UPDATE = 'listRechargeUpdate'

//本文件导出
var Redis2Mysql = module.exports;
/**
 * login 信息
 * [account,source,logintime, logoutime, logingold, logoutgold]
 */
Redis2Mysql.RedisPushLogin = function (data){
    logger.info("RedisPushLogin="+JSON.stringify(data));
    redisCmd.rpush(REDISKEY_LOGIN, JSON.stringify(data), function(err, reply){
        if(err){
            logger.err("redis2mysql RedisPushLogin =", err);
        }
    });
};

/**
 * logout 信息
 * [account,logintime, logoutime,logoutgold]
 */
Redis2Mysql.RedisPushLogout = function (data){
    //console.log('----------RedisPushLogout', JSON.stringify(data));
    redisCmd.rpush(REDISKEY_LOGOUT, JSON.stringify(data), function(err, reply){
        if(err){
            logger.err("redis2mysql RedisPushLogout =", err);
        }
    });
};
/**
 * 充值记录
 * [server_id,source,order_id, user_id, amount, recharge_date,status]
 */
Redis2Mysql.RedisPushRecharge = function (data){
    logger.info("RedisPushRecharge="+JSON.stringify(data));
    redisCmd.rpush(REDISKEY_RECHARGE, JSON.stringify(data), function(err, reply){
        if(err){
            logger.err("redis2mysql RedisPushRecharge =", err);
        }
    });
};
Redis2Mysql.RedisPushRecharge2 = function (data,cb){
    logger.info("RedisPushRecharge2="+JSON.stringify(data));
    redisCmd.rpush(REDISKEY_RECHARGE2, JSON.stringify(data), function(err, reply){
        if(err){
            logger.err("redis2mysql RedisPushRecharge =", err);
        }
        cb();
    });
};
Redis2Mysql.RedisPushRechargeUpdate = function (data,cb){
    console.log('----------RedisPushRechargeUpdate', JSON.stringify(data));
    redisCmd.rpush(REDISKEY_RECHARGE_UPDATE, JSON.stringify(data), function(err, reply){
        if(err){
            logger.err("redis2mysql RedisPushLogout =", err);
        }
        cb();
    });
};
/**
 * userInfo 信息
 * [level,vipLv, bullion,money,bronzeBox,silverBox, goldBox,platinumBox,gemBox]
 */
Redis2Mysql.RedisPushUserInfo = function (data){
    console.log('----------RedisPushUserInfo', JSON.stringify(data));
    redisCmd.rpush(REDISKEY_USERINFO, JSON.stringify(data), function(err, reply){
                    if(err){
            logger.err("redis2mysql RedisPushUserInfo =", err);
        }
    });
};


Redis2Mysql.RedisPushByUser = function (user){
    var signInDate = user.getValue("signInDate");
    Redis2Mysql.RedisPushUserInfo([
        user.getValue('outsideUuid'),
        user.getValue('nickname')
        ,user.getValue('level')
        ,user.getValue('vipLv')
        ,user.getValue('gold')
        ,user.getValue('gem')
        ,0
        ,user.getValue("vipNumber")
        ,0
        ,0
        ,0
        ,0
        ,0
        ,COMM.isSameDate(new Date(), new Date(signInDate*1))
        ,0
        ,0
        ,0
    ]);
};

/**
 * userInfo 信息
 * [level,vipLv, bullion,money,bronzeBox,silverBox, goldBox,platinumBox,gemBox]
 */
Redis2Mysql.RedisUpdateUserInfo = function (data){
    console.log('----------RedisUpdateUserInfo', JSON.stringify(data));
    redisCmd.rpush(REDISKEY_USERINFOUPDATE, JSON.stringify(data), function(err, reply){
        if(err){
            logger.err("redis2mysql RedisPushUserInfo =", err);
        }
    });
};

/**
 * 兑换码 信息
 * 
 */
Redis2Mysql.RedisUpdateRedeemCode = function (data){
    console.log('----------RedisUpdateRedeemCode', JSON.stringify(data));
    redisCmd.rpush(REDISKEY_REDEEMCODE, JSON.stringify(data), function(err, reply){
        if(err){
            logger.err("redis2mysql RedisUpdateRedeemCode =", err);
        }
    });
};
/**
 * userGold 信息
 * [level,vipLv, bullion,money,bronzeBox,silverBox, goldBox,platinumBox,gemBox]
 */
Redis2Mysql.RedisPushUserGoldChange = function (data){
    console.log('----------RedisPushUserGoldChange', JSON.stringify(data));
    redisCmd.rpush(REDISKEY_USERGOLDCHANGE, JSON.stringify(data), function(err, reply){
        if(err){
            logger.err("redis2mysql RedisPushUserGoldChange =", err);
        }
    });
};
Redis2Mysql.RedisUpdateUserGoldChange = function (data){
    console.log('----------RedisUpdateUserGoldChange', JSON.stringify(data));
    redisCmd.rpush(REDISKEY_USERGOLDCHANGEUPDATE, JSON.stringify(data), function(err, reply){
        if(err){
            logger.err("redis2mysql RedisUpdateUserGoldChange =", err);
        }
    });
};
Redis2Mysql.RedisPushGoldChangeByUser = function (user){
    Redis2Mysql.RedisPushUserGoldChange([
        user.getValue('outsideUuid')
        ,0
        ,0
        ,0
        ,0
    ]);
};
/**
 * goodsInfo 信息
 * [id,account,serverID,goodsName, bullion, userName, telephoneNumber,Email,status,exchange_date,remark]
 */
Redis2Mysql.RedisPushGoodsInfo = function (data,cb){
    logger.info("RedisPushGoodsInfo="+JSON.stringify(data));
    redisCmd.rpush(REDISKEY_GOODSINFO, JSON.stringify(data), function(err, reply){
        if(err){
            logger.err("redis2mysql RedisPushLogin =", err);
        }
        cb()
    });
};