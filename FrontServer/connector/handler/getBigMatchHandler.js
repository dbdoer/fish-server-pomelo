/**
 * 获取大奖赛信息**排行榜\服务器当前时间\**
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_BIG_MATCH_LIST,function(packetId, param, next){
    var resultInfo = {err: 0, infoList:[], time: ""};
    var user = param.user();
    var session = param.session;
    //console.log('===271 NI_SC_BIG_MATCH_LIST==>');
    if(!user || session == undefined){
        next(1, NID.NI_SC_BIG_MATCH_LIST, resultInfo);
        return;
    }
    var rpc = session.getRpcManager().getRpcByRType('BigMatchServer');
    if (!rpc) {
        resultInfo.err = 2;
        next(1, NID.NI_SC_BIG_MATCH_LIST, resultInfo);
        return;
    }
    var method = rpc.getMethod('getBigMatchInfo');
    if (!method) {
        resultInfo.err = 3;
        next(1, NID.NI_SC_BIG_MATCH_LIST, resultInfo);
        return;
    }
    method(function (err, list) {
        if(err != undefined || err != null || list == null){
            resultInfo.err = 4;
            next(1, NID.NI_SC_BIG_MATCH_LIST, resultInfo);
            return;
        }

        var curTime = Math.floor(Date.now() /1000);
        resultInfo.time =  curTime +'';
        resultInfo.infoList = list;
        console.log("==mods[271] NI_SC_BIG_MATCH_LIST=>resultInfo: ", JSON.stringify(resultInfo));
        next(null, NID.NI_SC_BIG_MATCH_LIST, resultInfo);
    });
})
