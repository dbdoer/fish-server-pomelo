"use strict";
/**
 * Created by lihao.cheng on 2017/1/5.
 *
 */
//var http = require('http');
var https = require("https");
var express = require("express");
var app = express();
var bodyParser = require('body-parser');
var crypto = require('crypto');
var xml2json=require('xml2json');

app.use(bodyParser.json());  // for parsing application/json
app.use(bodyParser.urlencoded({extended: true}));   // for parsing application/x-www-form-urlencoded


var serverConfig;

if(typeof (process.argv[2])  !== 'undefined'){
    serverConfig = JSON.parse(process.argv[2]);
}

var gs = require("../conf/config.json").ChargeServer;
if(!serverConfig){
    serverConfig = {
        local: gs.ip,
        rpc: gs.port,
        http: gs.port,
        socket: gs.port,
        master:gs.master      //TODO 提取到config中
    }
}

//console.log("=123123123==>serverConfig: ",JSON.stringify(serverConfig));
var LOCAL_ADDRESS = serverConfig.local; //本机地址
var PORT = serverConfig.http;
var RPC_SOCKET = serverConfig.rpc;
var MASTER_INFO = serverConfig.master;

var serverId = "ChargeServer:" + LOCAL_ADDRESS + ":" + PORT + ":1" ;
//var redis = require("../database/redis.js").getCluster();
var _redis = require("../conf/redis.json");
require("../dao/redis/redis").configure(_redis);
var redis = require('../dao/redis/redisCmd');
var userDao = require('../dao/userDao');
//var xml2js = require('xml2js');
var REDIS_UnicomOrder = "fish4UnicomOrderId";
var REDIS_KEY_ORDERID = "fish4OrderId:";
var REDIS_ORDER_INFO = "fish4OrderInfo:";

var rpcManager = require("../rpc/RpcManager.js")();


app.listen(PORT, function () {
    console.log('charge http server listener on port ' + PORT);
});
////测试
app.get("/fish4/ChargeServer", function (req, res) {
    console.log('--------------------ChargeServer req.query',req.query);
    res.end("404");
});
// 获取第三方充值数据
//测试url: http://192.168.2.38:40003/fish4/TongBuRecharge?source=tongbu&trade_no=e83970bcd36e6386bb84a424760133f2&amount=600
// &partner=161233&paydes=ID:104001&debug=1&tborder=1612301916249621&sign=5af6447e3c30d27d5e5d8b421deabfa1
app.get("/fish4/TongBuRecharge", function (req, res) {
    //console.log('----------------TongBuRecharge req.query', req.query);

    var string = "source"+"="+req.query.source+"&"+"trade_no"+"="+req.query.trade_no+"&"+"amount"+"="+req.query.amount+"&"+"partner"+"="+req.query.partner+
        "&"+"paydes"+"="+req.query.paydes+"&"+"debug"+"="+req.query.debug+"&"+"tborder"+"="+req.query.tborder+"&"+"key"+"="+"rIJnn6cadNIy6#7qS2KdJLHdp0bdOb1O";
    //console.log('----------------string',string);
    //var crypto = require('crypto');
    function md5 (text) {
        return crypto.createHash('md5').update(text).digest('hex');
    };
    var sign = md5(string);
    console.log('----------------sign',sign);

    if(sign==req.query.sign){
        console.log('----------------success');
        res.end(JSON.stringify({status: "success"}));
        var rpcFs = rpcManager.getRpcByRType('FrontServer');
        if (!rpcFs) {
            return;
        }
        var method = rpcFs.getMethod('rechargeInsert');
        if (!method) {
            return;
        }
        //[eval('('+req.query.source+')'),eval('('+req.query.trade_no+')'),eval('('+req.query.amount+')'),eval('('+req.query.partner+')')]
        method([req.query.source,req.query.trade_no,req.query.amount,req.query.partner], function (err) {
            if (err) {
                res.end(JSON.stringify({status: "error"}));
                return;
            }
        });
    }
    else{
        console.log('----------------error');
        res.end(JSON.stringify({status: "error"}));
    }

});

app.get("/fish4/appleRecharge", function (req, res) {
    //console.log("----------appleRecharge---------------------req.query",req.query);
    var string = req.query.receiptDate1+req.query.receiptDate2+req.query.receiptDate3;
    var verify= JSON.stringify({ 'receipt-data':string});// https://sandbox.itunes.apple.com/verifyReceipt
    var appstore_optios = {
        hostname: 'buy.itunes.apple.com',//sandbox.itunes.apple.com
        port: 443,
        path: '/verifyReceipt',
        method: 'POST',
        headers:{
            'Content-Type' : 'Keep-Alive',
            'Content-Length':verify.length
        }
    };
    var req2 = https.request( appstore_optios,function(res2){
        res2.setEncoding('utf8');
        res2.on('data', function (chunk) {
            //cb(true, chunk);
            var data = JSON.parse(chunk);
            console.log("-----------------data" ,data);
            if(data.status == 0){
                console.log("-----------------data.status" ,data.status);
                var rpcFs = rpcManager.getRpcByRType('FrontServer');
                if (!rpcFs) {
                    return;
                }
                var method = rpcFs.getMethod('rechargeInsert');
                if (!method) {
                    return;
                }
                method(["AppStore",data.receipt.original_purchase_date_ms,"0","161234"], function (err) {
                    if (err) {
                        res.end(JSON.stringify({code: 1}));
                        return;
                    }
                    console.log("-----------------AppStore");
                    res.end(JSON.stringify({code: 0,product_id:data.receipt.product_id,original_purchase_date_ms:data.receipt.original_purchase_date_ms}));
                });
                //res.end(JSON.stringify({code: 0}));
            }else {
                res.end(JSON.stringify({code: data.status}));
            }
        });
        res2.on('error', function (error) {
            console.log("error: " + error);
            //cb(false, error);
        });
    })
    req2.write(verify);
    req2.end();

    //res.end(JSON.stringify({code: 0}));

});
/*----------fish4 payment---------------------req.body { status: '1',
    user_age_min: '0',
    test_mode: 'False',
    uid: '100000000',
    vcurrency_key: 'point',
    user_locale: '',
    ts: '1490930632',
    user_country: '',
    currency: 'USD',
    vcurrency: 'point',
    token_all: 'ab62eb8a00c227e81ca9f1a303601823',
    rmoney: '99.99',
    token: '564da32270f1afd5fc9df3c8d2edb49f',
    appid: '161',
    tid: '12797',
    app_data: '{"product_id": "com.fpnew.fish.pack97200"}',
    type: 'googleplayiap' }*/

app.post("/fish4/payment", function (req, res) {
    
    console.log("----------fish4 payment---------------------req.body",req.body);
    if(req.body.app_data == undefined || req.body.tid == undefined || req.body.uid == undefined || req.body.currency == undefined){
        res.end(JSON.stringify({"status" : "ERROR", "reason" : "REASON"}));
        return;
    }
    var productID = JSON.parse(req.body.app_data).through_cargo;
    var tid = req.body.tid;
    var uid = req.body.uid;
    var currency = req.body.currency;
    console.log("----------fish4 payment-----------req.body through_cargo tid uid currency",productID,req.body.tid,req.body.uid,currency);
    var rpcFs = rpcManager.getRpcByRType('FrontServer');
    if (!rpcFs) {
        res.end(JSON.stringify({"status" : "ERROR", "reason" : "REASON"}));
        return;
    }
    var method = rpcFs.getMethod('purchasePayment');
    if (!method) {
        res.end(JSON.stringify({"status" : "ERROR", "reason" : "REASON"}));
        return;
    }
    method([uid,productID,tid,currency], function (err) {
        if (err && err!= 4) {
            res.end(JSON.stringify({"status" : "ERROR", "reason" : "REASON"}));
            return;
        }
        if (err && err== 4) {
            res.end(JSON.stringify({"status" : "OK", "reason" : "repeat"}));
            return;
        }
        console.log("-----------------purchasePayment OK");
        res.end(JSON.stringify({"status" : "OK", "reason" : "no reason"}));
    });

});
app.post("/fish4/ChargeServer2", function (req, res) {
    console.log('******************************req.query',req.query);
    console.log('******************************req.body',req.body);
    console.log('******************************req',req);
    res.end(JSON.stringify({code: 0}));
});

//联通支付返回订单号给客户端

var UnicomOrder = {};
app.post("/fish4/UnicomOrder",function (req ,res) {
    console.log('**************************联通支付返回订单号给客户端********************');
    console.log('******************************req.body',req.body);
    var uid = req.body.gameaccount;
    var productID = req.body.productID;
    if(uid == undefined || uid == null){
        res.end(JSON.stringify({orderId: "",code:1}));     //  用户不存在
        return;
    }
    userDao.loadByGuid(uid,function (err,reply) {
        if(err || reply == undefined || reply == null){
            res.end(JSON.stringify({orderId: "",code:2})); //   没有玩家数据
            return;
        }
        var outsideUuid = reply.outsideUuid;
        var time = new Date().getTime();
        var orderId = "00" + outsideUuid.toString() + time.toString();
        //将订单号以及当前时间戳存库以便校验
        if(orderId.length != 24){
            res.end(JSON.stringify({orderId: "",code:3}));     //    订单号长度不对
            return;
        }

        var nowDate = new Date();
        var dateY = nowDate.getFullYear();
        var dateM = nowDate.getMonth() +1;
        var dateD = nowDate.getDate();
        var dateH = nowDate.getHours();
        var dateS = nowDate.getMinutes();
        var dateC = nowDate.getSeconds();
        if(dateM < 10){
            dateM = "0"+dateM;
        }
        if(dateD < 10){
            dateD = "0"+dateD;
        }
        if(dateH < 10){
            dateH = "0"+dateH;
        }
        if(dateS < 10){
            dateS = "0"+dateS;
        }
        if(dateC < 10){
            dateC = "0"+dateC;
        }
        var orderTime = dateY.toString()+dateM.toString()+dateD.toString()+dateH.toString()+dateS.toString()+dateC.toString();
        var userInfo = {
                    "productID":productID,
                    "gameaccount":uid,
                    "imei":req.body.imei,
                    "macaddress":req.body.macaddress,
                    "ipaddress":req.body.ipaddress,
                    "serviceid":req.body.serviceid,
                    "channelid":req.body.channelid,
                    "appversion":req.body.appversion,
                    "orderId":orderId,
                    "orderTime":orderTime
        };
        UnicomOrder = userInfo;
         //redis.hmset(REDIS_OrderId + outsideUuid,userInfo,function (ERR, RES) {
        //     console.log('*****************************保存联通沃商店订单号信息成功');
        // });
        console.log('--------------------orderId',orderId);
        res.end(JSON.stringify({orderId: orderId,code:200}));
    });

});

//联通沃商店订单校验接口
//{"callbackReq":{"orderid":"001000003971497006379801","ordertime":"20170609190625","cpid":"91002997","appid":"90810000569620170508152645847700","fid":"12243",
// "consumeCode":"110112416106","payfee":"600","payType":"6","hRet":"1","status":"00009","signMsg":"77361cbe0612e5a47f76a77ecb959931"}}
app.post("/fish4/UnicomRecharge",function (req ,res) {
    console.log('**************************联通沃商店订单校验接口********************');
    console.log('******************************req.query',req.query);
    //console.log('-----------------------------UnicomOrder',UnicomOrder);
    var response = {};
    var serviceid = req.query.serviceid;
    function md5 (text) {
        return crypto.createHash('md5').update(text).digest('hex');    //.digest('hex')
    };
    var nowDate = new Date();
    var dateY = nowDate.getFullYear()+"";
    var dateM = nowDate.getMonth() +1+"";
    var dateD = nowDate.getDate()+"";
    var dateH = nowDate.getHours()+"";
    var dateS = nowDate.getMinutes()+"";
    var dateC = nowDate.getSeconds()+"";
    if (dateM >= 1 && dateM <= 9) {
        dateM = "0" + dateM;
    }
    if (dateD >= 0 && dateD <= 9) {
        dateD = "0" + dateD;
    }
    if (dateH >= 0 && dateH <= 9) {
        dateH = "0" + dateH;
    }
    if (dateS >= 0 && dateS <= 9) {
        dateS = "0" + dateS;
    }
    if (dateC >= 0 && dateC <= 9) {
        dateC = "0" + dateC;
    }
    var ordertime = dateY+dateM+dateD+dateH+dateS+dateC;
    console.log("------------------ordertime", ordertime);
    req.rawBody = '';
    var json={};
    req.setEncoding('utf8');

    req.on('data', function(chunk) {
        req.rawBody += chunk;
    });
    req.on('end', function() {
        //console.log('-------------------------req.rawBody',req.rawBody);
        json=JSON.parse(xml2json.toJson(req.rawBody));

        //res.send(JSON.stringify(json));
        console.log('-------------------------json',json);
        if(serviceid){
            var string = "orderid"+"="+json.checkOrderIdReq.orderid+"&"+"Key"+"="+"3e3f52db6193c6ab8a8a";
            var signMsg = json.checkOrderIdReq.signMsg;
            console.log('----------------string',string);
            var sign = md5(string);
            console.log('----------------sign',sign);
            var orderId= json.checkOrderIdReq.orderid;
            var orderInfo = UnicomOrder[orderId];
            console.log('----------------orderInfo',orderInfo);
            if(sign == signMsg){
                redis.hgetall(REDIS_ORDER_INFO + json.checkOrderIdReq.orderid, function (err, info) {
                    console.log("-----------------info1",info);
                    response.checkOrderIdRsp = 0;
                    response.gameaccount = info.gameaccount;
                    response.imei = info.imei;
                    response.macaddress = info.macaddress;
                    response.ipaddress = info.ipaddress;
                    response.serviceid = info.serviceid;
                    response.channelid = info.channelid;
                    response.cpid = '91002997';
                    response.ordertime = ordertime;
                    response.appversion = info.appversion;
                    res.end('<?xml version="1.0" encoding="UTF-8"?><paymessages><checkOrderIdRsp>'+response.checkOrderIdRsp+'</checkOrderIdRsp><gameaccount>'+response.gameaccount+
                        '</gameaccount><imei>'+response.imei+'</imei><macaddress>'+response.macaddress+'</macaddress><ipaddress>'+response.ipaddress+'</ipaddress><serviceid>'+response.serviceid+
                        '</serviceid><channelid>'+response.channelid+'</channelid><cpid>'+response.cpid+'</cpid><ordertime>'+response.ordertime+'</ordertime><appversion>'+response.appversion+
                        '</appversion></paymessages>');
                    console.log('----------------res.end','<?xml version="1.0" encoding="UTF-8"?><paymessages><checkOrderIdRsp>'+response.checkOrderIdRsp+'</checkOrderIdRsp><gameaccount>'+response.gameaccount+
                        '</gameaccount><imei>'+response.imei+'</imei><macaddress>'+response.macaddress+'</macaddress><ipaddress>'+response.ipaddress+'</ipaddress><serviceid>'+response.serviceid+
                        '</serviceid><channelid>'+response.channelid+'</channelid><cpid>'+response.cpid+'</cpid><ordertime>'+response.ordertime+'</ordertime><appversion>'+response.appversion+
                        '</appversion></paymessages>');
                    return;
                });

            }else {
                response.checkOrderIdRsp = 1;
                res.end('<?xml version="1.0" encoding="UTF-8"?><paymessages><checkOrderIdRsp>'+response.checkOrderIdRsp+'</checkOrderIdRsp><gameaccount>'+response.gameaccount+
                    '</gameaccount><imei>'+response.imei+'</imei><macaddress>'+response.macaddress+'</macaddress><ipaddress>'+response.ipaddress+'</ipaddress><serviceid>'+response.serviceid+
                    '</serviceid><channelid>'+response.channelid+'</channelid><cpid>'+response.cpid+'</cpid><ordertime>'+response.ordertime+'</ordertime><appversion>'+response.appversion+
                    '</appversion></paymessages>');
            }

        }else {
            console.log('----------------json.callbackReq',json.callbackReq);
            var string = "orderid"+"="+json.callbackReq.orderid+"&"+"ordertime"+"="+json.callbackReq.ordertime+"&"+"cpid"+"="+json.callbackReq.cpid+"&"+"appid"+"="+json.callbackReq.appid+
                "&"+"fid"+"="+json.callbackReq.fid +"&"+"consumeCode"+"="+json.callbackReq.consumeCode+"&"+"payfee"+"="+json.callbackReq.payfee+"&"+"payType"+"="+json.callbackReq.payType+
                "&"+"hRet"+"="+json.callbackReq.hRet+"&"+"status"+"="+json.callbackReq.status+"&"+"Key"+"="+"3e3f52db6193c6ab8a8a";
            console.log('----------------string',string);
            var signMsg = json.callbackReq.signMsg;
            console.log('----------------signMsg',signMsg);
            var sign = md5(string);
            console.log('----------------sign',sign);
            if(sign == signMsg){
                redis.lrange (REDIS_KEY_ORDERID , 0,-1, function (err, reply) {
                    console.log("-----------------UnicomRecharge  reply",reply);
                    for(var k = 0;k < reply.length;k++){
                        if(reply[k] == json.callbackReq.orderid){
                            res.end('<?xml version="1.0" encoding="UTF-8"?><callbackRsp>0</callbackRsp>');
                            return;
                        }
                    }
                    redis.hgetall(REDIS_ORDER_INFO + json.callbackReq.orderid, function (err, info) {
                        console.log("-----------------info2",info);
                        if (info == undefined) {
                            res.end('<?xml version="1.0" encoding="UTF-8"?><callbackRsp>0</callbackRsp>');
                            return;
                        }
                        //客户端发放道具
                        var rpcFs = rpcManager.getRpcByRType('FrontServer');
                        if (!rpcFs) {
                            res.end('<?xml version="1.0" encoding="UTF-8"?><callbackRsp>0</callbackRsp>');
                            return;
                        }
                        var method = rpcFs.getMethod('purchaseUnipay');
                        if (!method) {
                            res.end('<?xml version="1.0" encoding="UTF-8"?><callbackRsp>0</callbackRsp>');
                            return;
                        }
                        method([info.uid,info.productID], function (err) {
                            if (err) {
                                res.end('<?xml version="1.0" encoding="UTF-8"?><callbackRsp>0</callbackRsp>');
                                return;
                            }
                            console.log("-----------------res.end 11111111");
                            redis.lpush(REDIS_KEY_ORDERID ,json.callbackReq.orderid, function () {
                                console.log("-----------------res.end 2222222");
                                res.end('<?xml version="1.0" encoding="UTF-8"?><callbackRsp>1</callbackRsp>');
                                return;
                            });
                        });
                    });

                });

            }else {
                res.end('<?xml version="1.0" encoding="UTF-8"?><callbackRsp>0</callbackRsp>');
            }
        }
    });

});
//联通支付结果通知
app.post("/fish4/UnicomResult",function (req, res) {
    console.log('**************************联通支付结果通知********************');
    console.log('******************************req.query',req.query);
    var key = "3e3f52db6193c6ab8a8a";

    /*var builder = new xml2js.Builder();  // JSON->xml
    var parser = new xml2js.Parser();   //xml -> json
    var json =  parser.parseString(req.body.callbackReq);

    if(json == undefined || json == null){
        res.end(builder.buildObject({callbackRsp:-1}));
        return;
    }

    var str = md5("orderid="+json.orderid+"&"+
        "ordertime="+json.ordertime+"&"+
        "cpid="+json.cpid+"&"+
        "appid="+json.appid+"&"+
        "fid="+json.fid+"&"+
        "consumeCode="+json.consumeCode+"&"+
        "payfee="+json.payfee+"&"+
        "payType="+json.payType+"&"+
        "hRet="+json.hRet+"&"+
        "status="+json.status+"&"+
        "Key="+key);
    //redis.hgetall(REDIS_OrderId + json.orderId.substr(2,9),function (err, reply) {
    //     if(err || reply == undefined || reply == null){
    //         return;
    //     }
        //console.log('*****************************************reply',reply);
        if(json.hRet == 0 && str == json.signMsg){
            //客户端发放道具
            var rpcFs = rpcManager.getRpcByRType('FrontServer');
            if (!rpcFs) {
                return;
            }
            var method = rpcFs.getMethod('purchaseUnipay');
            if (!method) {
                return;
            }
            method([UnicomOrder.uid,UnicomOrder.productID], function (err) {
                if (err) {
                    return;
                }
            });
            res.end(builder.buildObject({callbackRsp:1}));
        }else{
            res.end(builder.buildObject({callbackRsp:-1}));
        }*/
    //});


});

var DEPENDENCIES_SERVERS = ["FrontServer","ChargeServer"]; //需要通过rpc进行连接的server类型
require("../util/SetupServer.js")(serverId, redis, rpcManager,
    function (rType) {
        for (var i = 0; i < DEPENDENCIES_SERVERS.length; i++) {
            if (rType === DEPENDENCIES_SERVERS[i]) {
                return true;
            }
        }
        return false;
    }, MASTER_INFO);

process.on('uncaughtException', function (err) {
    //打印出错误
    console.log(err.stack || err.message);
});


