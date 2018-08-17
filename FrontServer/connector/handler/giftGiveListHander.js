/**
 礼物记录
 */

var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var redis = require("../../../dao/redis/redisCmd");
var giftDao = require("../../../dao/giftDao");
var logger = require("../../../common/logHelper").helper;
var REDIS_KEY = "fish4gift:";
var async = require('async');

handlerMgr.handler(NID.NI_CS_GIFT_RECORD,function(packetId, param, next){
    var user = param.user();
    var resultInfo = {recordList:[{name:"",giftId:0,time:""}]};
    if(user == undefined){
        next(1,NID.NI_SC_GIFT_RECORD,resultInfo);
        return;
    }

    giftDao.loadByGuid(user.uid,function (err, reply) {
        if(err || reply == undefined || reply == null){
            next(1,NID.NI_SC_GIFT_RECORD,resultInfo);
            return;
        }

        var info=[];
        var delInfo = [];  // 超过三十天的记录
        for (var key in reply){
            if(reply[key] != undefined){
                info.push(reply[key]);
                var endTime = key*1 + 24*3600*30*1000;
                //删除超过30天的记录
                if(endTime < new Date().getTime()*1){
                    delInfo.push(reply[key]);
                }
            }
        }

        var delNum = info.length - 30;
        var delData = info.slice(0,delNum);  // 超过三十条的所有记录
        console.log('**************************************delData.length',delData.length);
        //console.log('**************************************delData',delData);
        if(delInfo.length > 0 || delData.length > 0){
            var count = 0;
            var _count = 0;
            async.whilst(
                function () {
                    return count < delInfo.length;
                },
                function (callBack) {
                    redis.hdel(REDIS_KEY + user.uid,delInfo[count]["time"] , function (err,res) {
                        if(err || res == 0){
                            return;
                        }
                        count ++;
                        callBack();
                    });
                },
                function (err) {
                    if (err || count >= delInfo.length) {
                        return;
                    }
                }
            );
            async.whilst(
                function () {
                    return _count < delData.length;
                },
                function (callBack) {
                    redis.hdel(REDIS_KEY + user.uid,delData[_count]["time"] , function (err,res) {
                        if(err || res == 0){
                            return;
                        }
                        _count ++;
                        callBack();
                    });
                },
                function (err) {
                    if (err || _count >= delData.length) {
                        return;
                    }
                }
            );
            giftDao.loadByGuid(user.uid,function (ERR, RESULT) {
                if (ERR || RESULT == undefined || RESULT == null) {
                    next(1, NID.NI_SC_GIFT_RECORD, resultInfo);
                    return;
                }
                for(var k in RESULT){
                    info.push(RESULT[k]);
                }
            });
        }
        console.log('**************************************info.length',info.length);
        resultInfo.recordList = info;
        //console.log('**************************************resultInfo',resultInfo);
        next(null,NID.NI_SC_GIFT_RECORD,resultInfo);
    });

});