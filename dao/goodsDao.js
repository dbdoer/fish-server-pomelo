/*!
 * Copyright(c) 2014 jason.bin <23692515@qq.com>
 * 关于用户数据redis 操作
 * 数据库交互的数据在本文件完成，数据库中数据格式不要传到外层
 * 数据库需要序列列在此处处理
 * 逻辑层交互最小单位是obj
 */
var redisCmd = require("./redis/redisCmd");
var CONST = require('../common/consts');
var DBKEY = "fish4goods:";
var USERDBKEY = "fish4goodsUserinfo:";

//本文件导出
var GoodsDao = module.exports;
/**
 * 已经存在用户写档,key values 对应
 * h_user 写档
 */
GoodsDao.write = function (user, cb){
    if(user == undefined){
        cb(1, null);
        return;
    }

    //初始化设置玩家信息保存到数据库
    var mng = user.contMng;
    var guid = user.getUid();
    var writeData = mng.goods.writeDataToDbByUid();
    //console.log("-------------------101writeData2",writeData);
    redisCmd.hmset(
        DBKEY + guid,
        writeData,
        function (err, reply) {
            cb(err, reply);
        });
};
/**
 *读档, 读档成功后生item对象
 */
GoodsDao.load = function (user,cb){
    //var uid    = user.getUid();
    var cmd     = DBKEY ;
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
        //console.log("----------113-------------------------------reply",reply);
        user.contMng.goods.fromDb(reply);
        cb(null, {});
    });
}


/**
 *删除指定OBJ
 */
GoodsDao.delete = function (user, mailguid, cb){
    if(user == undefined || mailguid == undefined){
        cb(1, null);
        return;
    }
    var cmd  = DBKEY + user.getUid();
    redisCmd.hdel(cmd, mailguid, function (err, reply) {
        cb(err, reply);
    });
}