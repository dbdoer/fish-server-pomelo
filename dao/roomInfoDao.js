/*!
 *
 */
var redisCmd = require("./redis/redisCmd");
var CONST = require('../common/consts');
var DBKEY = "fish4RoomInfo";

//本文件导出
var roomInfoDao = module.exports;
/**
 * 已经存在用户写档,key values 对应
 * h_user 写档
 */
roomInfoDao.write = function (saveRoomInfo, cb){
    if(saveRoomInfo == undefined){
        cb(1,null); return;
    }
    var writeData = {};
    for(var key in saveRoomInfo){
        var _obj = saveRoomInfo[key];
        if(!_obj){
            continue;
        }
        writeData[key] = JSON.stringify(_obj);
    }

    redisCmd.hmset( DBKEY, writeData,
        function (err, reply) {
        cb(err, reply);
    });
};

/**
 *读档
 */
roomInfoDao.load = function (cb){
    redisCmd.hgetall(DBKEY, function (err, reply) {
        if (err) {
            cb(err, null);
            return;
        }
        if (!reply) {
            cb(err,  null);
            return;
        }
        var info = {};
        for(var key in reply){
            info[key] = JSON.parse(reply[key]);
        }
        cb(null, info);
    });
}
