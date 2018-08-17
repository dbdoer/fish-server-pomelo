/**
 * 小白鼠
 * 用于功能测试
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;

//msg id 999
handlerMgr.handler(NID.NI_TEST,function(packetId, param, next){
    next(null, {code: 0, msg:{}});
})
