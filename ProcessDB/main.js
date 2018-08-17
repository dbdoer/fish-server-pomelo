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

var mysqlServer = function() {
};

module.exports = mysqlServer;
var pro = mysqlServer.prototype;
pro.init = function (){
    this.loop();
};

pro.loop = function (){
    this.loop_login();
    this.loop_logout();
    this.loop_userInfo();
    this.loop_userInfoUpdate();
    this.loop_RedeemCodeUpdate();
    //this.loop_Recharge();
    this.loop_UserGoldChange();
    this.loop_UserGoldChangeUpdate();
    //this.loop_GoodsInfo();
};

//POP List数据
pro.lPopData = function(key, callback) {
    redisCmd.lpop(key, function (err, reply) {
        if (err) {
            logger.err("processDB redis.lpop error %s", JSON.stringify(err));
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


pro.loop_login = function () {
    this.processLogin(function (is) {
        if (!is) {
            setTimeout(function () {
                pro.loop_login();
            }, 30000);
        } else {
            pro.loop_login();
        }
    })
}

/**
 * LOGIN 数据转换
 */
pro.processLogin = function (cb) {
    var self = this;
    var key = 'listLogin';          //redis key
    var cmd = 'REPLACE INTO `t_login`(`account`,`source`,`login_time`,`logout_time`, `gold0`,`gold1`) VALUES (?,?,FROM_UNIXTIME(?),FROM_UNIXTIME(?), ?,?)';
    //var cmd = 'INSERT INTO `t_login`(`acc`,`source`,`login_time`,`logout_time`, `gold0`,`gold1`) VALUES (?,?,FROM_UNIXTIME(?),FROM_UNIXTIME(?), ?,?)';
    var valueList = [];
    var maxNum = 100;       //100条记录写档一次
    var inputValue = [];

    for(var i = 0; i < maxNum; i++) {
        inputValue.push(key);
    }
    //console.log("---------reply0");
    var total = 0;
    async.forEach(inputValue, function(key, callback) {
        self.lPopData(key, function(reply) {
            if(reply) {
                if(valueList.length > 0){
                    cmd = cmd +  ',(?,?,FROM_UNIXTIME(?),FROM_UNIXTIME(?), ?,?)';
                }
                valueList = valueList.concat(JSON.parse(reply));
            }
            callback(total++ < maxNum? null:"Full");
        });
    }, function(error) {
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



pro.loop_logout = function () {
    this.processLogout(function (is) {
        if (!is) {
            setTimeout(function () {
                pro.loop_logout();
            }, 30000);
        } else {
            pro.loop_logout();
        }
    })
}

/**
 * LOGOUT 数据转换
 */
pro.processLogout = function (cb) {
    var self = this;
    var key = 'listLogout';          //redis key
    var cmd = 'UPDATE `t_login` SET `logout_time` = FROM_UNIXTIME(?) , `gold1`=? WHERE account = ? and `login_time` = FROM_UNIXTIME(?)';

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

pro.loop_userInfo = function () {
    this.processUserInfo(function (is) {
        if (!is) {
            setTimeout(function () {
                pro.loop_userInfo();
            }, 30000);
        } else {
            pro.loop_userInfo();
        }
    })
}
pro.processUserInfo = function (cb) {
    var self = this;
    var key = 'listUserInfo';          //redis key
    var cmd = 'REPLACE INTO `t_user`(`account`,`name`,`level`,`vipLv`,`gold`,`gem`,`bullion`,`money`, `bronzeBox`,`silverBox`,`goldBox`,`platinumBox`,`gemBox`,`isSign`,`dayNum`,`totalTime`,`bigMatchInfo`) VALUES (?,?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?,?)';
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
            if(reply) {
                if(valueList.length > 0){
                    cmd = cmd +  ',(?,?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?,?)';
                }
                valueList = valueList.concat(JSON.parse(reply));
            }
            callback(total++ < maxNum? null:"Full");
        });
    }, function(error) {
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

pro.loop_userInfoUpdate = function () {
    this.processUserInfoUpdate(function (is) {
        if (!is) {
            setTimeout(function () {
                pro.loop_userInfoUpdate();
            }, 30000);
        } else {
            pro.loop_userInfoUpdate();
        }
    })
}
pro.processUserInfoUpdate = function (cb) {
    var self = this;
    var key = 'listUserInfoUpdate';          //redis key
    var cmd = 'UPDATE `t_user` SET `level`=?,`vipLv`=?,`gold`=?,`gem`=?,`bullion`=?,`money`=?,`bronzeBox`=?,`silverBox`=?,`goldBox`=?,`platinumBox`=?,`gemBox`=?,`isSign`=?,`dayNum`=?,`totalTime`=?,`bigMatchInfo`=? WHERE account = ?';

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


pro.loop_RedeemCodeUpdate = function () {
    this.processRedeemCodeUpdate(function (is) {
        if (!is) {
            setTimeout(function () {
                pro.loop_RedeemCodeUpdate();
            }, 30000);
        } else {
            pro.loop_RedeemCodeUpdate();
        }
    })
}
pro.processRedeemCodeUpdate = function (cb) {
    var self = this;
    var key = 'listRedeemCodeUpdate';          //redis key
    var cmd = 'UPDATE `code` SET `used_num`=? WHERE code = ?';

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
pro.loop_Recharge = function () {
    this.processRecharge(function (is) {
        if (!is) {
            setTimeout(function () {
                pro.loop_Recharge();
            }, 30000);
        } else {
            pro.loop_Recharge();
        }
    })
}
pro.processRecharge = function (cb) {
    var self = this;
    var key = 'listRecharge';          //redis key
    var cmd = 'REPLACE INTO `recharge`(`server_id`,`order_id`,`user_id`,`amount`, `recharge_date`,`status`) VALUES (?,?,?,?,FROM_UNIXTIME(?),?)';
    //var cmd = 'INSERT INTO `t_login`(`acc`,`source`,`login_time`,`logout_time`, `gold0`,`gold1`) VALUES (?,?,FROM_UNIXTIME(?),FROM_UNIXTIME(?), ?,?)';
    var valueList = [];
    var maxNum = 100;       //100条记录写档一次
    var inputValue = [];

    for(var i = 0; i < maxNum; i++) {
        inputValue.push(key);
    }
    //console.log("---------reply2");
    var total = 0;
    async.forEach(inputValue, function(key, callback) {
        self.lPopData(key, function(reply) {
            if(reply) {
                /*console.log("---------reply2",reply);
                console.log("---------valueList.length1",valueList.length);*/
                if(valueList.length > 0){
                    cmd = cmd +  ',(?,?,?,?,FROM_UNIXTIME(?),?)';
                }
                valueList = valueList.concat(JSON.parse(reply));
            }
            callback(total++ < maxNum? null:"Full");
        });
    }, function(error) {
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
pro.loop_UserGoldChange = function () {
    this.processUserGoldChange(function (is) {
        if (!is) {
            setTimeout(function () {
                pro.loop_UserGoldChange();
            }, 30000);
        } else {
            pro.loop_UserGoldChange();
        }
    })
}
pro.processUserGoldChange = function (cb) {
    var self = this;
    var key = 'listUserGoldChange';          //redis key
    var cmd = 'REPLACE INTO `userGoldChange`(`account`,`gold`,`gem`,`bullion`, `box`) VALUES (?,?,?,?,?)';
    //var cmd = 'INSERT INTO `t_login`(`acc`,`source`,`login_time`,`logout_time`, `gold0`,`gold1`) VALUES (?,?,FROM_UNIXTIME(?),FROM_UNIXTIME(?), ?,?)';
    var valueList = [];
    var maxNum = 100;       //100条记录写档一次
    var inputValue = [];

    for(var i = 0; i < maxNum; i++) {
        inputValue.push(key);
    }
    //console.log("---------reply2");
    var total = 0;
    async.forEach(inputValue, function(key, callback) {
        self.lPopData(key, function(reply) {
            if(reply) {
                if(valueList.length > 0){
                    cmd = cmd +  ',(?,?,?,?,?)';
                }
                valueList = valueList.concat(JSON.parse(reply));
            }
            callback(total++ < maxNum? null:"Full");
        });
    }, function(error) {
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
pro.loop_UserGoldChangeUpdate = function () {
    this.processUserGoldChangeUpdate(function (is) {
        if (!is) {
            setTimeout(function () {
                pro.loop_UserGoldChangeUpdate();
            }, 30000);
        } else {
            pro.loop_UserGoldChangeUpdate();
        }
    })
}
pro.processUserGoldChangeUpdate = function (cb) {
    var self = this;
    var key = 'listUserGoldChangeUpdate';          //redis key
    var cmd = 'UPDATE `userGoldChange` SET `gold`=?,`gem`=?,`bullion`=?,`box`=? WHERE account = ?';

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
pro.loop_GoodsInfo = function () {
    this.processGoodsInfo(function (is) {
        console.log("---------is",is);
        if (!is) {
            setTimeout(function () {
                pro.loop_GoodsInfo();
            }, 30000);
        } else {
            pro.loop_GoodsInfo();
        }
    })
}
pro.processGoodsInfo = function (cb) {
    //console.log("---------processGoodsInfo");
    var self = this;
    var key = 'listGoodsInfo';          //redis key
    var cmd = 'REPLACE INTO `exchange_record`(`id`,`server_id`,`goods_name`,`price`,`user_name`, `phone`,`status`,`time`,`remark`) VALUES (?,?,?,?,?,?,?,FROM_UNIXTIME(?),?)';
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
            console.log("---------reply",reply);
            if(reply) {
                if(valueList.length > 0){
                    cmd = cmd +  ',(?,?,?,?,?,?,?,FROM_UNIXTIME(?),?)';
                }
                valueList = valueList.concat(JSON.parse(reply));
            }
            callback(total++ < maxNum? null:"Full");
        });
    }, function(error) {
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
var r2db = new mysqlServer();
r2db.init();