/**
 * 预定义表情和文字
 */
var handlerMgr = require("./../handlerMgr");

var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_EXPRESSION_INFO,function(packetId, param, next){
    //console.log("------------------------220");
    var user = param.user();
    var data = param.data;
    //console.log("------------------------220data",data);
    if(user == undefined || user == null){
        next(1,  NID.NI_SC_EXPRESSION_INFO, {code:1});
        return;
    }
    if(data == undefined || data == null){
        next(1,  NID.NI_SC_EXPRESSION_INFO, {code:2});
        return;
    }
    if(data.messageId == undefined){
        next(1,  NID.NI_SC_EXPRESSION_INFO, {code:3});
        return;
    }

    user.rpcTrans('expression', [data.messageId,data.messageContent], function (err, ret) {
        next(null,  NID.NI_SC_EXPRESSION_INFO, {code:0});
    });
   
})
