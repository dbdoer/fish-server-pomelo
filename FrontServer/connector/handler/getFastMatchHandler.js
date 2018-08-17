/**
 * 获取快速赛列表
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var COMM = require("../../../common/commons");

handlerMgr.handler(NID.NI_CS_FAST_MATCH_LIST,function(packetId, param, next){
    var session = param.session;
    var user = param.user();
    if(!user|| session == undefined){
        next(1, NID.NI_SC_FAST_MATCH_LIST, {list: []});
        return;
    }
    console.log('= 264 NI_SC_FAST_MATCH_LIST=+++=>uid: ', user.uid);

    var rpc = session.getRpcManager().getRpcByRType('MatchQueueServer');
    if (!rpc) {
        next(2, NID.NI_SC_FAST_MATCH_LIST, {list: []});
        return;
    }
    var method = rpc.getMethod('getFastMatchInfo');
    if (!method) {
        next(3, NID.NI_SC_FAST_MATCH_LIST, {list: []});
        return;
    }
    method(function (list) {
        //console.log('=NID.NI_SC_FAST_MATCH_LIST=+++=>list: ',list);
        list = [{"count": 2, "cost": 30000, "total ": 999},
            {"count": 4, "cost": 30000, "total ": 999},
            {"count": 8, "cost": 30000, "total ": 999},
            {"count": 40, "cost": 30000, "total ": 999}];
        //console.log('=mods["264"]=++++++++=>list: ',list);
        next(null, NID.NI_SC_FAST_MATCH_LIST, {list: list});
    });
})
