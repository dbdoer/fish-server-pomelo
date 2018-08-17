"use strict";

/**
 *   redis 数据转为mysql 数据
 */

//redis 初始化
var _redis = require("../conf/redis.json");
require("../dao/redis/redis").configure(_redis);
//mysql 初始化
var _mysql = require("../conf/mysql.json");
require("../dao/mysql/mysql").configure(_mysql);

var redisCmd = require("../dao/redis/redisCmd");
var mysql = require("../dao/mysql/mysqlDao");
var logger = require("../common/logHelper").helper;
var async = require('async');

/*var codeSelect = function() {
};

module.exports = codeSelect;*/
module.exports = function() {
    return new SelectOrInsert();
};
function SelectOrInsert() {
    
}
var pro = SelectOrInsert.prototype;
pro.init = function (){
    this.loop();
};

pro.loop = function (){
    
};

pro.processRedeemCodeSelect = function (cb) {
    var self = this;
    var cmd = 'SELECT * FROM `code`';
    mysql.execute2('gameserver', cmd, function(err,result){
        if(err){
            logger.err("mysql info " + err);
        }

        cb(err,result);
    });
    
};
pro.processGoodsSelect = function (cb) {
    var self = this;
    var cmd = 'SELECT * FROM `exchange`';
    mysql.execute2('gameserver', cmd, function(err,result){
        if(err){
            logger.err("mysql info " + err);
        }

        cb(err,result);
    });

};
pro.processNoticeSelect = function (cb) {
    var self = this;
    var cmd = 'SELECT * FROM `game_notice`';
    mysql.execute2('gameserver', cmd, function(err,result){
        if(err){
            logger.err("mysql info " + err);
        }

        cb(err,result);
    });

};
pro.processActivitySelect = function (cb) {
    var self = this;
    var cmd = 'SELECT * FROM `active`';
    mysql.execute2('gameserver', cmd, function(err,result){
        if(err){
            logger.err("mysql info " + err);
        }

        cb(err,result);
    });

};
pro.processPictureSelect = function (cb) {
    var self = this;
    var cmd = 'SELECT * FROM `code`';
    mysql.execute2('gameserver', cmd, function(err,result){
        if(err){
            logger.err("mysql info " + err);
        }

        cb(err,result);
    });

};
pro.processTradeSelect = function (cb) {
    var self = this;
    var cmd = 'SELECT trade_no FROM `recharge2`';
    mysql.execute2('gameserver', cmd, function(err,result){
        if(err){
            logger.err("mysql info " + err);
        }

        cb(err,result);
    });

};
pro.lPopData = function(key, callback) {
    redisCmd.lpop(key, function (err, reply) {
        if (err) {
            logger.error("processDB redis.lpop error %s", JSON.stringify(err));
            callback(null);
            return;
        }
        if(!reply) {
            callback(null);
            return;
        }
        callback(reply);
    });
};
pro.processGoodsInfo = function (cb) {
    //console.log("---------processGoodsInfo");
    var self = this;
    var key = 'listGoodsInfo';          //redis key
    var cmd = 'REPLACE INTO `exchange_record`(`id`,`server_id`,`goods_name`,`price`,`user_name`, `phone`,`email`,`status`,`time`,`remark`) VALUES (?,?,?,?,?,?,?,?,FROM_UNIXTIME(?),?)';
    //var cmd = 'INSERT INTO `t_login`(`acc`,`source`,`login_time`,`logout_time`, `gold0`,`gold1`) VALUES (?,?,FROM_UNIXTIME(?),FROM_UNIXTIME(?), ?,?)';
    var valueList = [];
    var maxNum = 100;       //100条记录写档一次
    var inputValue = [];

    for(var i = 0; i < maxNum; i++) {
        inputValue.push(key);
    }

    var total = 0;
    async.forEach(inputValue, function(key, callback) {
        self.lPopData(key, function(reply) {
            //console.log("---------reply",reply);
            if(reply) {
                if(valueList.length > 0){
                    cmd = cmd +  ',(?,?,?,?,?,?,?,FROM_UNIXTIME(?),?)';
                }
                valueList = valueList.concat(JSON.parse(reply));
            }

            callback(total++ < maxNum? null:"Full");
        });
    }, function(error) {
        //console.log("---------valueList.length",valueList.length, error);
        if(valueList.length) {
            mysql.execute('gameserver', cmd, valueList, function(err){
                if(err){
                    logger.err("mysql info " + err);
                    cb(false);
                    return;
                }
                cb(true);
            });
        } else {
            cb(false);
        }
    });
};

pro.processRecharge2 = function (cb) {
    //console.log("---------processGoodsInfo");
    var self = this;
    var key = 'listRecharge2';          //redis key
    var cmd = 'REPLACE INTO `recharge2`(`source`,`trade_no`,`amount`,`partner`) VALUES (?,?,?,?)';
    //var cmd = 'INSERT INTO `t_login`(`acc`,`source`,`login_time`,`logout_time`, `gold0`,`gold1`) VALUES (?,?,FROM_UNIXTIME(?),FROM_UNIXTIME(?), ?,?)';
    var valueList = [];
    var maxNum = 100;       //100条记录写档一次
    var inputValue = [];

    for(var i = 0; i < maxNum; i++) {
        inputValue.push(key);
    }

    var total = 0;
    async.forEach(inputValue, function(key, callback) {
        self.lPopData(key, function(reply) {
            //console.log("---------reply",reply);
            if(reply) {
                if(valueList.length > 0){
                    cmd = cmd +  ',(?,?,?,?)';
                }
                valueList = valueList.concat(JSON.parse(reply));
            }

            callback(total++ < maxNum? null:"Full");
        });
    }, function(error) {
        //console.log("---------valueList.length",valueList.length);
        if(valueList.length) {
            mysql.execute('gameserver', cmd, valueList, function(err){
                if(err){
                    logger.err("mysql info " + err);
                }
                cb(true);
            });
        } else {
            cb(false);
        }
    });
};
pro.processRechargeUpdate = function (cb) {
    console.log("---------listRechargeUpdate");
    var self = this;
    var key = 'listRechargeUpdate';          //redis key
    var cmd = 'UPDATE `recharge2` SET `account` = ? ,`amount` = ?, `time`=FROM_UNIXTIME(?),`state`=? WHERE trade_no = ?';

    self.lPopData(key, function(reply) {
        if(!reply) {
            cb(false);
            return ;
        }

        mysql.execute('gameserver', cmd, JSON.parse(reply), function(err){
            if(err){
                logger.err("mysql info " + err);
            }
            cb(true);
        });
    });
};