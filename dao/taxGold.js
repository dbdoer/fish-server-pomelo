/*
* 比赛收益存档
* 只有房间关闭时写档
* */
var redisCmd = require("./redis/redisCmd");
var DBKEY = "taxGold";

//本文件导出
var TaxDao = module.exports;
/**
 * 已经存在用户写档,key values 对应
 * h_user 写档
 */
TaxDao.write = function (info, cb){
    //初始化设置玩家信息保存到数据库
    redisCmd.hset(
        DBKEY,
        info,
        function (err, reply) {
            cb(err, reply);
        });
};

//// 根据昵称进行数据库读档操作
TaxDao.loadByName = function(key, cb){
    if(key == undefined){
        cb(1, null);
        return;
    }
    redisCmd.hget(DBKEY, key, function (err, reply) {
        //console.log('==TaxDao.loadByName==>err, reply: ',err, reply)
        if (err || !reply) {
            cb(err, null);
            return;
        }
        cb(null, reply);
    });
}

TaxDao.load = function (cb){
    redisCmd.hgetall(DBKEY, function (err, reply) {
        if (err) {
            cb(err, null);
            return;
        }
        if (!reply) {
            //这种情况是数据中没有该user,可能是个新用户
            cb(err,  null);
            return;
        }
        cb(null, reply);
    });
}

