/**
 * 定时领奖查询
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_DEBUG_COMMAND,function(packetId, param, next){

    var ret = "error";
    var session = param.session;
    var user = param.user();
    if(!user || !session || param.data == undefined){
        next(1, NID.NI_SC_DEBUG_COMMAND, {result: "can not find user"});
        return;
    }

    var cmd = param.data.cmd;
    if(cmd == undefined){
        next(1, NID.NI_SC_DEBUG_COMMAND, {result: "command param error"});
        return;
    }
    var arr = cmd.toString().split("/");
    if(arr.length < 3 && arr[0] != "god"){
        next(1, NID.NI_SC_DEBUG_COMMAND, {result: "command param error"});
        return;
    }

    if(arr[0] == "set"){
        if(arr[1] == undefined || arr[2] == undefined || arr[1] ==""|| arr[2] ==""){
            next(1, NID.NI_SC_DEBUG_COMMAND, {result: "param is undefined"});
            return;
        }
        if(arr[1] == "level" && user.setValue(arr[1], arr[2])){
            var l_exp = global.levelInfo[arr[2]];
            if(l_exp != undefined && user.setValue("experience", l_exp.experience *1)) {
                ret = "ok";
                user.writeToDb();
            }
        }else if(arr[1] == "vipLv" && user.setValue(arr[1], arr[2])){
            var l_vip = global.vip[arr[2]];
            if(l_vip != undefined && user.setValue("vipNumber", l_vip.Price *1)) {
                ret = "ok";
                user.writeToDb();
            }
        }else {
            if (user.setValue(arr[1], arr[2])) {
                ret = "ok";
                user.writeToDb();
            }
        }
    }else if( arr[0] == "get" ){
        if(arr[1] == undefined || arr[1] ==""){
            next(1, NID.NI_SC_DEBUG_COMMAND, {result: "param is undefined"});
            return;
        }
        ret = user.getValue(arr[1]);
    }

    if( arr[0] == "god" ){
        if(arr[1] == undefined || arr[1] == ""){
            next(1, NID.NI_SC_DEBUG_COMMAND, {result: "param is undefined"});
            return;
        }
        global.g_GameBreaker[user.uid] = arr[1];
        ret = "ok";
    }
    next(null, NID.NI_SC_DEBUG_COMMAND, {result: ret});
})
