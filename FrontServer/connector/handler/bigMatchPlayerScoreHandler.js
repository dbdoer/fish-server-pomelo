/**
 * 获取个人在大奖赛中的场次下的得分
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_BIG_MATCH_PLAYERSCORE,function(packetId, param, next){
    var resultInfo = {err: 0, scoreList:[]};
    var user = param.user();
    var session = param.session;
    //console.log('===273 NI_SC_BIG_MATCH_PLAYERSCORE==>');
    if(!user || session == undefined){
        next(1, NID.NI_SC_BIG_MATCH_PLAYERSCORE, resultInfo);
        return;
    }
    var rpc = session.getRpcManager().getRpcByRType('BigMatchServer');
    if (rpc == undefined || rpc == null) {
        resultInfo.err = 2;
        next(1, NID.NI_SC_BIG_MATCH_PLAYERSCORE, resultInfo);
        return;
    }
    var method = rpc.getMethod('getBigMatchScore');
    if (method == undefined || method == null) {
        resultInfo.err = 3;
        next(1, NID.NI_SC_BIG_MATCH_PLAYERSCORE, resultInfo);
        return;
    }
    method(user.uid, function (err, result) {
        //console.log("==mods[273]==>err ,result= ", err, result);
        if(err != undefined || err != null || result == null){
            resultInfo.err = 4;
            next(1, NID.NI_SC_BIG_MATCH_PLAYERSCORE, resultInfo);
            return;
        }

        resultInfo.scoreList = result;
        next(null, NID.NI_SC_BIG_MATCH_PLAYERSCORE, resultInfo);
    });
})
