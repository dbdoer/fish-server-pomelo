
/**
 * 获取经典赛列表
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var TotalDao = require("../../../dao/countUserRoomDao");
var async = require("async");
var capture = require("../../../Resources/capture.json");

var ROOM_TYPE = {
    MATCH2:1            //2人赛
    ,MATCH4:2           //4人赛
    ,MATCH8:3           //8人赛
    ,MATCH40:4          //40人赛
}


handlerMgr.handler(NID.NI_CS_NORMAL_ROOM_LIST,function(packetId, param, next){

    var error = 1;
    async.parallel([
            function(callback){
                TotalDao.get(ROOM_TYPE.MATCH2,function(err, result){
                    callback(err, result);
                });
            },
            function(callback){
                TotalDao.get(ROOM_TYPE.MATCH4,function(err, result){
                    callback(err, result);
                });
            },
            function(callback){
                TotalDao.get(ROOM_TYPE.MATCH8,function(err, result){
                    callback(err, result);
                });
            },
            function(callback){
                TotalDao.get(ROOM_TYPE.MATCH40,function(err, result){
                    callback(err, result);
                });
            }
        ],
        function(err, results){
            if(!err){
                var room = [{type:1, count:0},{type:2, count:0},{type:3, count:0},{type:4, count:0}];
                room[0].count = results[0] *1?results[0]*1+capture[1112001].base_number*1:capture[1112001].base_number*1;
                room[1].count = results[1] *1?results[1]*1+capture[1112002].base_number*1:capture[1112002].base_number*1;
                room[2].count = results[2] *1?results[2]*1+capture[1112003].base_number*1:capture[1112003].base_number*1;
                room[3].count = results[3] *1?results[3]*1+capture[1112004].base_number*1:capture[1112004].base_number*1;
                error = null;
            };
            next(error, NID.NI_SC_NORMAL_ROOM_LIST, {room:room});
        });
})
