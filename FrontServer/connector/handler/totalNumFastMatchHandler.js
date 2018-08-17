/**
 * 获取快速赛列表
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var TotalDao = require("../../../dao/countUserFastMatchDao");
var async = require("async");

var FAST_TYPE = {
    MATCH2:1            //2人赛
    ,MATCH4:2           //4人赛
    ,MATCH8:3           //8人赛
    ,MATCH40:4          //40人赛
}


handlerMgr.handler(NID.NI_CS_TOTAL_NUM_FAST_MATCH,function(packetId, param, next){

    var error = 1;
    async.parallel([
            function(callback){
                TotalDao.get(FAST_TYPE.MATCH2,function(err, result){
                    callback(err, result);
                });
            },
            function(callback){
                TotalDao.get(FAST_TYPE.MATCH4,function(err, result){
                    callback(err, result);
                });
            },
            function(callback){
                TotalDao.get(FAST_TYPE.MATCH8,function(err, result){
                    callback(err, result);
                });
            },
            function(callback){
                TotalDao.get(FAST_TYPE.MATCH40,function(err, result){
                    callback(err, result);
                });
            }
        ],
        function(err, results){
            var room = [{type:1, count:0},{type:2, count:0},{type:3, count:0},{type:4, count:0}];
            if(!err && results != undefined){
                room[0].count = results[0]?results[0]:0;
                room[1].count = results[1]?results[1]:0;
                room[2].count = results[2]?results[2]:0;
                room[3].count = results[3]?results[3]:0;
                error = null;
            };
            next(error, NID.NI_SC_TOTAL_NUM_FAST_MATCH, {room:room});
        });
})
