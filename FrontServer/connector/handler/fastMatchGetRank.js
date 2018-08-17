/**
 * 快速赛排名
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var COMM = require("../../../common/commons");
var logger = require("../../../common/logHelper").helper;
/**
 * code = 0:表示不在比赛ing , 1:表示在比赛ing ,其余都是错误值
 */
handlerMgr.handler(NID.NI_CS_GET_MATCH_RANK,function(packetId, param, next){
    var user = param.user();
    if(user == undefined){
        next(1, NID.NI_SC_GET_MATCH_RANK, {code:1});
        return;
    }
    user.rpcTrans('getRank', [''],  function (err, resultInfo) {
        if(err){
            logger.err('uid=%s , err=%s', user.getUid(), err);
        }
        next(err, NID.NI_SC_GET_MATCH_RANK, resultInfo);
    });


})
