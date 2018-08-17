/**
 * 数值debug
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
//var async = require('../../../node_modules/async');

handlerMgr.handler(NID.NI_CS_COEFFICIENT_DEBUG,function(packetId, param, next){
    console.log("------------------------116");
    var user = param.user();
    var data = param.data;

    if(user == undefined || user == null){
        console.log("===116 NI_CS_FIRE ===>user || data == undefined");
        next(1,  NID.NI_SC_COEFFICIENT_DEBUG, {errCode:1,result:{}});
        return;
    }
    //var rechargeCoefficient = user.getValue("rechargeCoefficient")*1;

    user.rpcTrans('coefficientCheck',[], function (err, ret) {
        //console.log('----------116---------------ret: ',ret);
        if (err || !ret ) {
            console.log("===116 NI_CS_FIRE ===>err=%s, ret=%s",err, ret);
            next(1,  NID.NI_SC_COEFFICIENT_DEBUG, {errCode:2,result:{}});
            return;
        }
        
        next(null,  NID.NI_SC_COEFFICIENT_DEBUG, {errCode:0,result:{currentProfitEP:JSON.stringify(ret.currentProfitEP),coefficient:JSON.stringify(ret.coefficient),
            basicsCoefficient:JSON.stringify(ret.basicsCoefficient),rechargeCoefficient:JSON.stringify(ret.rechargeCoefficient),noviceCoefficient:JSON.stringify(ret.noviceCoefficient),
            posCoefficient:JSON.stringify(ret.posCoefficient),roomCoefficient:JSON.stringify(ret.roomCoefficient)}});
    });

    //////一个异步模块测试Demo
    /*var arr = [{name:'Jack', delay: 200},
        {name:'Mike', delay: 100},
        {name:'Freewind', delay: 300}];

    async.forEachSeries(arr, function(item, callback) {
        console.log("1.1 enter: " + item.name);
        setTimeout(function(){
            console.log("1.1 handle: " + item.name);
            callback();
        }, item.delay);
    }, function(err) {
        console.log("1.1 err: " + err);
    });*/
    //////

})
