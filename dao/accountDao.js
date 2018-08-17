/*!
 * Copyright(c) 2016 jason.bin <23692515@qq.com>
 * 账号信息 redis 操作
 * 数据库交互的数据在本文件完成，数据库中数据格式不要传到外层
 * 数据库需要序列列在此处处理
 * 逻辑层交互最小单位是obj
 */


var redisCmd = require("./redis/redisCmd");
//第三方帐号 跟GUID的 映射表
var accountDao = module.exports;


/**
 * 第三方帐号 和 Guid映射表    h_InviteCodeToGuid    h_NameToGuid
 */
accountDao.setMappingToGuid = function (tbl_name,key,guid,cb){
        var data = {};
        data[key] = guid;
        redisCmd.hmset(tbl_name, data, function (err, reply) {
            //if( err )
            //    log.error("Error inviteCodeToGuid Guid=[%s] Error=[%s]",guid,err);
            cb(err, reply);
        });
};


/**
 * 获取玩家GUID 通过第三方帐号获取
 * tbl_name 表名字 邀请码映射表
 * 或者 名字映射表   h_InviteCodeToGuid    h_NameToGuid
 */
accountDao.getGuidFromMappingKey = function (tbl_name,key, cb){
        var data = [];
        data[0] = key;
        redisCmd.hmget(tbl_name, data, function (err, reply) {
            //if( err )
            //    log.error("Error getGuidFromMappingKey Error=[%s]",err);
            cb(err, reply[0]);
        });
};

/**
 * 检测指定key 已经存在
 */
accountDao.checkIsHave = function (tbl_name,key, cb){
        redisCmd.hexists(tbl_name,key,function (err, reply) {
            //if( err )
            //    log.error("Error mapToGuidDaoWrapper checkIsHave error=[%s]",err);
            cb(err, reply);
        });
};