/**
 * 心跳
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var KICKOFF_TIMEOUT = 5000;
handlerMgr.handler(NID.NI_CS_HEARTBEAT,function(msg, param, next){
    //console.log("------------------------222");
    var now = Date.now();
    var obj = {
        secondtime: Math.floor(now / 1000),
        microtime: now % 1000
    };


    var user = param.user();
    if(!user){
        next(1, NID.NI_SC_HEARTBEAT, obj);
        return;
    }
    ////记录在线时长
    var time = user.time;
    //console.log("------------------------222 time",time);
    var totalTime = user.getValue('totalTimeOneDay')*1;
    totalTime += now - time;
    user.setValue('totalTimeOneDay',totalTime);
    //console.log("------------------------222 totalTime",totalTime);
    user.time = now;

    var session = param.session;
    var sid = param.conn._sid;
    if(session == undefined || session.getSession(sid) == undefined){
        next(1, NID.NI_SC_HEARTBEAT, obj);
        return;
    }
    //console.log("------------------------222 session.getSession(sid).timeout",session.getSession(sid).timeout);
    if(session.getSession(sid).timeout != undefined){
        clearTimeout(session.getSession(sid).timeout);
    }
    session.getSession(sid).timeout = setTimeout(function () {
        session.kickoff(sid);
    }, KICKOFF_TIMEOUT);

    next(null, NID.NI_SC_HEARTBEAT, obj);
})
