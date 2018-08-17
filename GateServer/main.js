"use strict";
/**
 * Created by lihao.cheng on 2016/6/15.
 * 网关服务器 http服务器
 * 同时也是登录服务器 分发FrontServer给client 并负责登录
 */

var express = require("express");
var redis = require("../database/redis").getCluster();
//var _redis = require("../conf/redis.json");
//require("../dao/redis/redis").configure(_redis);
//var redis = require('../dao/redis/redisCmd');


var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());  // for parsing application/json
app.use(bodyParser.urlencoded({extended: true}));   // for parsing application/x-www-form-urlencoded

var uuid = require("uuid");
var rpcManager = require("../rpc/RpcManager")(redis);
//var log = require("../log/log.js").logger("normal");

var logger = require("../common/logHelper").helper;
var rpcServer = require("../rpc/RpcServer")();
var gmCommunication = require("./GmCommunication")(app,rpcManager);
var configs = require('../Resources');//加载各个config到内存中
var skillInfo = require("../Resources/skill");
var skin = require("../Resources/skin");
var session = require("../session/session");
var JsonUser = require("../obj/json/user.json");
var userDao = require('../dao/userDao');
var config = require('../conf/config');
var http = require('http');
var https = require("https");
var request = require('request');
var curl = require('node-curl');

var REDIS_KEY_USER_COUNTER = "fish4uid_counter";
var REDIS_KEY_USER_ACCOUNT = "fish4uid_account";
var REDIS_KEY_USER_TO_UID = "user2uid:";
var REDIS_KEY_USER_INFO = "fish4user:";
var REDIS_KEY_ONLINE_SERVER = "fish4online_servers";
var REDIS_KEY_ONLINE_USER_LIST = "fish4online_users:";//在线用户列表
var REDIS_KEY_NAME = "fish4name:";
var REDIS_UID_NAME = "fish4uid:";
var REDIS_ID_NAME = "fish4numId:";
var REDIS_KEY_OUT2IN = "out2in:";
var REDIS_NUM_ID = "fish4clientID";
var REDIS_NOTICE_LINK = "fish4NoticeLink:";
var REDIS_FUNCTION_KEY = "fish4FunctionKey:";
var REDIS_GOODS_EXCHANGE = "fish4goods:";
var DBKEY = "fish4user:";
var TONG_BU_USERID = "fish4UserTongBu:";  //每个平台的渠道号和userId都不一样，所以拼接之后的key不一样
var CLOSE_SERVER = "fish4CloseServer";
var REDIS_REGISTER_TIME = "fish4RegisterTime";
var redis2mysql = require('../dao/redis2mysql');
var nickNameGet = require('../Resources/randomNameManager');

//var serverVersion = config.Version;	//server version

//get server configuration
var serverConfig;

if (typeof (process.argv[2]) !== 'undefined') {
    serverConfig = JSON.parse(process.argv[2]);
}

var gs = require("../conf/config.json").GateServer;
if (!serverConfig) {
    serverConfig = {
        local : gs.ip,
        rpc : gs.port,
        http : gs.port,
        socket : gs.port,
        master : gs.master      //TODO 提取到config中
    }
}

//console.log("=123123123==>serverConfig: ",JSON.stringify(serverConfig));
var LOCAL_ADDRESS = serverConfig.local; //本机地址
var PORT = serverConfig.http;
var RPC_SOCKET = serverConfig.rpc;
var MASTER_INFO = serverConfig.master;

//本server的id
var SERVER_ID = "GateServer:" + LOCAL_ADDRESS + ":" + PORT + ":0";


//set listening port
app.listen(PORT, function () {
    console.log('gate http server listener on port ' + PORT);
});

//matching path
app.get("/", function (req, res) {
    res.end("404");
});

// 获取第三方充值数据
//测试url: http://192.168.2.38:40003/fish4/TongBuRecharge?source=tongbu&trade_no=e83970bcd36e6386bb84a424760133f2&amount=600
// &partner=161233&paydes=ID:104001&debug=1&tborder=1612301916249621&sign=5af6447e3c30d27d5e5d8b421deabfa1
/*app.get("/fish4/TongBuRecharge", function (req, res) {
    //console.log('----------------TongBuRecharge req.query', req.query);

    var string = "source"+"="+req.query.source+"&"+"trade_no"+"="+req.query.trade_no+"&"+"amount"+"="+req.query.amount+"&"+"partner"+"="+req.query.partner+
        "&"+"paydes"+"="+req.query.paydes+"&"+"debug"+"="+req.query.debug+"&"+"tborder"+"="+req.query.tborder+"&"+"key"+"="+"rIJnn6cadNIy6#7qS2KdJLHdp0bdOb1O";
    //console.log('----------------string',string);
    var crypto = require('crypto');
    function md5 (text) {
        return crypto.createHash('md5').update(text).digest('hex');
    };
    var sign = md5(string);
    //console.log('----------------sign',sign);

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
        method([req.query.source,req.query.trade_no,req.query.amount,req.query.partner], function (err, result) {
            if (err || result == undefined) {
                return;
            }
        });
    }
    else{
        console.log('----------------error');
        res.end(JSON.stringify({status: "error"}));
    }

});*/
//第三方同步账号登录验证
app.get("/fish4/tongBuRegister", function(req, res) {
    //console.log('----------------------tongBuRegister req.query',req.query);
    var sessionId = req.query.sessionID;
    var channel = req.query.channel;

    //get 请求外网
    //var content = [100,goodsName,bullionNum,userName,telephoneNumber];
    var stringArr = "http://tgi.tongbu.com/api/LoginCheck.ashx?session=%s&appid=161233".split('%s');
    var string = '';
    string += stringArr[0] + sessionId +stringArr[1];
    //console.log('----------------------string',string);
    /*for(var i =0; i< stringArr.length-1; i++){
        if(stringArr[i] != undefined) {
            string += stringArr[i] + content[i];
        }
    }*/
    http.get(string,function(req,res1){
        var html='';
        req.on('data',function(data){
            html+=data;
        });
        req.on('end',function(){
            console.log("------------html",html);
            if(html == undefined||html == 0||html == -1){
                res.end(JSON.stringify({code: 3}));  //验证不通过
                return;
            }
            //console.log("------------TONG_BU_USERID + channel+html",TONG_BU_USERID + channel+html);
            redis.get(TONG_BU_USERID + channel+html, function (err,uid) {
                //console.log("------------uid",uid);
                if(uid == null){
                    console.log("------------Register");
                    res.end(JSON.stringify({code: 1}));  //走注册
                    return;
                }else {
                    console.log("------------Login");
                    res.end(JSON.stringify({code: 2}));  //走登录
                    return;
                }

            });
        });
    });

});
//Facebook账号登录验证
app.get("/fish4/FacebookRegister", function(req, res) {
    //console.log('----------------------FacebookRegister req.query',req.query);
    var input_token = req.query.input_token;
    var channel = req.query.channel;
    //{"error":{"message":"Error validating access token: The user has not authorized application 401490103558218.","type":"OAuthException","code":190,"error_subcode":458,"fbtrace_id":"F7v5hCYpfFn"}}
    //get 请求外网
    var stringArr = "https://graph.facebook.com/me?access_token=%s".split('%s');//"https://graph.facebook.com/me?access_token=%s".split('%s')
    var string = '';
    string += stringArr[0] + input_token;
    console.log('----------------------string',string);
    curl(string, function(err) {
        console.log(this.body);
        if(this.body == undefined || this.body.error != undefined){
            res.end(JSON.stringify({code: 3})); //账号不存在
            return;
        }
        var faceBookId = JSON.parse(this.body).id;
        console.log("-----------------faceBookId",faceBookId);
        if(faceBookId == undefined){
            res.end(JSON.stringify({code: 4})); //账号不存在
            return;
        }
        redis.get(TONG_BU_USERID + channel + faceBookId, function (err,uid) {
            //console.log("------------uid",uid);
            if(uid == null){
                console.log("------------Register");
                res.end(JSON.stringify({code: 1}));  //走注册
                return;
            }else {
                console.log("------------Login");
                res.end(JSON.stringify({code: 2}));  //走登录
                return;
            }

        });
    });

    /*var get_config = function(site_url){
        var config = {
            url : ((site_url)),
            proxy : 'http://localhost:1080'
        };

        return config;
    };
    request(
        get_config(string)
        , (function (error, response, body) {
            //console.log("-----------------response",response);
            console.log("-----------------body",body);
            if(body == undefined){
                res.end(JSON.stringify({code: 3})); //账号不存在
                return;
            }
            var faceBookId = JSON.parse(body).id;
            console.log("-----------------faceBookId",faceBookId);
            /!*console.log(response.statusCode);
             console.error(response.headers);*!/
            redis.get(TONG_BU_USERID + channel + faceBookId, function (err,uid) {
                //console.log("------------uid",uid);
                if(uid == null){
                    console.log("------------Register");
                    res.end(JSON.stringify({code: 1}));  //走注册
                    return;
                }else {
                    console.log("------------Login");
                    res.end(JSON.stringify({code: 2}));  //走登录
                    return;
                }

            });
        })
    );*/


});
//国内第三方平台登录验证
app.get("/fish4/otherPlatformRegister", function(req, res) {
    console.log('----------------------otherPlatformRegister req.query',req.query);
    var channel = req.query.channel;
    var platformId = req.query.id;
    if(channel == undefined||platformId == undefined){
        res.end(JSON.stringify({code: 3}));  //验证不通过
        return;
    }
    redis.get(TONG_BU_USERID + channel + platformId, function (err,uid) {
        //console.log("------------uid",uid);
        if(uid == null){
            console.log("------------Register");
            res.end(JSON.stringify({code: 1}));  //走注册
            return;
        }else {
            console.log("------------Login");
            res.end(JSON.stringify({code: 2}));  //走登录
            return;
        }

    });

});

//第三方正式用户注册
app.get("/fish4/TongBuUserRegister", function (req, res) {
    console.log('----------------TongBuUserRegister req.query', req.query);
    //客户端版本号与服务器版本号对比
    if (checkVer(req.query.ver, res)) {

        initTongBuPlayer(req.query, function (result) {
            console.log('init player 1');
            res.end(result);
        });

    }
});
function initTongBuPlayer(info, cb) {
    console.log('======================= step1,info: ',info);
    var nickname = info.nickname;
    var FBnickname = info.FBnickname;
    var channel = info.channel;
    var headImage = info.headimage;
    var macStr = info.macStr;
    var userID = info.userID;
    redis.get(REDIS_NUM_ID, function (err, clientID) {
        console.log('----------------------clientID ', clientID);
        if (err) {
            cb(JSON.stringify({code : 8}));
        }
        if (clientID == null) {
            clientID = 100000000;
        }
        redis.incr(REDIS_KEY_USER_COUNTER, function (err, count) {
            var userSkill = {};
            for (var i in skillInfo) {
                userSkill[i] = skillInfo[i].cost;
            }
            var skins = {};
            var curSkinId = 0;
            for (var key in skin) { /// 只选一个
                skins[key] = 1;
                curSkinId = key * 1;
                break;
            }
            var guestUuid = uuid.v1(); //游客唯一id
            var internalUuid = uuid.v1(); //用户唯一id
            var outsideUuid = clientID; //玩家可见id
            var type = 0;
            //console.log('======================= step2, count, guestUuid, internalUuid: ', count, guestUuid, internalUuid);
            //console.log('--------------TONG_BU_USERID +channel+ userID2222', TONG_BU_USERID +channel+ userID);
            redis.set(TONG_BU_USERID +channel+ userID, internalUuid, function () {
            redis.set(REDIS_KEY_USER_TO_UID + guestUuid, internalUuid, function () {
                var obj = JsonUser;
                obj.uid = internalUuid;
                obj.channel = channel;
                obj.headImage = headImage;
                obj.FBheadImage = userID;
                obj.FBnickname = FBnickname;
                obj.outsideUuid = outsideUuid;
                obj.nickname = nickname;
                //obj.account = account;
                //obj.password	=	 password;
                // 更为json 默认值了
                obj.gold = global.other[1].initial_gold;
                //obj.gem	        =	 INIT_GEM;
                obj.coupon = 0;
                obj.skills = JSON.stringify(userSkill);
                obj.curSkinId = curSkinId;
                obj.unlockSkins = JSON.stringify(skins);

                console.log('======================= step3,internalUuid ', internalUuid);
                redis.hmset(REDIS_KEY_USER_INFO + internalUuid, obj, function (err, result) {
                    //console.log(JSON.stringify(arguments));
                    redis.set(REDIS_KEY_OUT2IN + clientID, internalUuid, function () {
                        //console.log(JSON.stringify(arguments));
                    });
                    /// xiahou add 8/15 修改昵称时需要做处理
                    var newStr = '';
                    for (var i = 0; i < nickname.length; i++) {
                        newStr += '\\u' + nickname.charCodeAt(i).toString(16);
                    }
                    redis.set(REDIS_KEY_NAME + newStr, internalUuid, function () {
                        console.log('=====12123======>>>>> ', REDIS_KEY_NAME + newStr, nickname);
                    });
                    /*redis.set(REDIS_UID_NAME + account, internalUuid, function () {
                    });*/
                    redis.set(REDIS_UID_NAME + outsideUuid, internalUuid, function () {
                    });
                    if (macStr !== undefined) {
                        console.log('======================= step4 ');
                        /// 不存在则插入Redis中
                        redis.hmset(REDIS_KEY_USER_ACCOUNT + ":" + macStr, {playerUid: internalUuid}, function () {
                            console.log('======================= step4 macStr ',macStr);
                            redis.get(REDIS_ID_NAME + macStr, function (err, numId) {
                                console.log('--------------numId',numId);
                                if (numId == null) {
                                    type = 1;       //后端清库前端不需要弹合并弹窗
                                }
                                redis.get(numId, function (err, password) {
                                    console.log('--------------password',password);
                                     console.log('--------------typeof password',typeof password);
                                    if (password != "") {
                                        type = 1;  //已经合并过前端不需要弹合并弹窗
                                    }
                                    var result = {guestid: guestUuid, uid: internalUuid, showid: outsideUuid, type: type};
                                    //console.log('======================= step5result ',result);
                                    clientID++;
                                    redis.set(REDIS_NUM_ID, clientID, function () {
                                        cb(JSON.stringify(result));
                                    });
                                });
                            });
                            /*var result = {guestid: guestUuid, uid: internalUuid, showid: outsideUuid};
                            //console.log('======================= step5result ',result);
                            clientID++;
                            redis.set(REDIS_NUM_ID, clientID, function () {
                                cb(JSON.stringify(result));
                            });*/


                            /*var result = {guestid: guestUuid, uid: internalUuid, showid: outsideUuid,type:type};
                             cb(JSON.stringify(result));*/
                        });
                    } else {
                        console.log('======================= step5 ');
                        cb(JSON.stringify({code: 9}));   //没有mac地址
                        /*var result = {guestid: guestUuid, uid: internalUuid, showid: outsideUuid, type: 1};
                         clientID++;
                         redis.set(REDIS_NUM_ID,clientID, function () {
                         cb(JSON.stringify(result));
                         });*/
                    }
                });
            });
        });
        });
    });

}
//游客账号和FaceBook等第三方账号合并
app.get('/fish4/tongBuAccountMerge', function (req, res) {
    console.log('----------------tongBuAccountMerge',req.query);
    var account = req.query.account;   //不是数字账号，是userID
    //var password = req.query.password;
    var guestid = req.query.guestid;
    var macStr = req.query.macStr;
    var channel = req.query.channel;
    var FBnickname = req.query.FBnickname;
    /*redis.get(account,function (err,password){
     if(err || err != undefined||password != null){
     res.end(JSON.stringify({code: 1}));return;
     }
     });*/
    /*redis.set(account,password, function () {
     });*/
    redis.get(REDIS_KEY_USER_TO_UID + guestid, function (err,uid) {
        /*if(err || err != undefined||uid == undefined){
         res.end(JSON.stringify({code:5}));
         }*/
        redis.set(TONG_BU_USERID +channel+ account, uid, function () {
            redis.hset(REDIS_KEY_USER_INFO + uid, "FBheadImage",account, function (){
                redis.hset(REDIS_KEY_USER_INFO + uid, "FBnickname",FBnickname, function (){
                redis.get(REDIS_ID_NAME + guestid, function (err, numId) {
                    redis.set(numId, "tongBuAccountMergeIdentification", function () {      //账号已合并标识
                        redis.hdel(REDIS_KEY_USER_ACCOUNT + ":" + macStr,"guestUid", function () {
                            //console.log('----------------password', password);
                            redis.get(REDIS_NUM_ID, function (err, clientID) {
                                clientID--;
                                redis.set(REDIS_NUM_ID,clientID, function () {
                                    res.end(JSON.stringify({numId: numId}));
                                });
                            });
                        });
                    });
                });
              });
            });

        });
    });
});
//第三方登录
app.get('/fish4/TongBuChooseServer', function (req, res) {
    console.log('----------------TongBuChooseServer',req.query);
    //客户端版本号与服务器版本号对比
    if (checkVer(req.query.ver, res)) {
        TongBuLogin(req, res);
    }
});
//第三方登录
function TongBuLogin(req, res) {
    console.log('----------------------- TongBuLogin',req.query);
    var userID = req.query.userID;
    var channel = req.query.channel;
    var now = Date.now();
    redis.get(CLOSE_SERVER, function (err,isClose) {
        console.log('----------------------- isClose',isClose);
        if(isClose*1 == 1){
            console.log('----------------------- isClose222',isClose);
            res.end(JSON.stringify({code: 15}));//关服
            return;
        }
        //console.log('----------------------- isClose333333333');
        redis.get(TONG_BU_USERID +channel+ userID, function (err,uuid) {
            var uid = uuid;
            //账号封存
            redis.hgetall(DBKEY + uid, function (err, reply) {
                if (err || !reply || Object.keys(reply).length <= 0) {
                    console.log("=+++--***=>serverList:55555555555");
                    logger.err("-------------TongBuLogin, err,reply = " + err,reply);
                    res.end(JSON.stringify({code: 12}));//查库错误或账号数据错误
                    return;
                }

                if(now < reply.endTime*1 ){
                    res.end(JSON.stringify({code: 11}));return;  //账号被封
                    return;
                }

                ////功能按键开关功能
                //redis.hgetall(REDIS_FUNCTION_KEY, function (err,functionKey) {
                var user = session.getUser(uid);
                if(user){
                    res.end(JSON.stringify({code: 8}));return;
                }
                //var uid = req.query.uid;//原本由前端传过来改为通过用户名和密码查库后得到
                //log.info("login:" + uid);
                var isRobot = req.query.isrobot;
                //找user记录
                redis.hgetall(REDIS_KEY_USER_INFO + uid, function (err, obj) {
                    if (!obj) {
                        //log.info("empty!!!");
                        return res.end(JSON.stringify({code: 1, uuid: 0, server: null, uid: uid}));
                    }
                    //如果有user ||   lrange 0是第一个元素  -1是最后一个元素
                    redis.lrange(REDIS_KEY_ONLINE_SERVER, 0, -1, function (err, serverList) {
                        console.log("=+++--***=>serverList: ",serverList);
                        if (serverList.length == 0) {
                            //长连接服务器列表是空的
                            res.end(JSON.stringify({code: 2, uuid: 0, server: null, uid: uid}));
                            return;
                        }
                        serverList.sort();
                        var len = serverList.length;


                        var script = "return {";
                        var arr = [];
                        for (var i in serverList) {
                            var index = parseInt(i) + 1;
                            script += "redis.call('llen',KEYS[" + index + "]),"
                        }
                        script = script.substr(0, script.length - 1) + "}";

                        arr.push(script, len);
                        for (var i in serverList) {
                            arr.push(REDIS_KEY_ONLINE_USER_LIST + serverList[i]);
                        }

                        console.log("script for redis \n" + arr.toString());

                        redis.eval(arr, function (err, _usernums) {
                            //usernums 对应每个服务器的用户数量(大概)
                            //========================临时措施
                            var usernums = [];
                            for (var serIndex = 0; serIndex < len; serIndex++) {
                                if (_usernums !== undefined && _usernums[serIndex] != undefined) {
                                    usernums[serIndex] = _usernums[serIndex];
                                } else {
                                    usernums[serIndex] = 0;
                                }
                            }
                            //==============================
                            var chooseserverindex = -1;
                            var max = 7000;  //单服务器人数上限
                            if (isRobot) {
                                max = 5000;
                            }

                            for (var i = 0; i < serverList.length; i++) {
                                console.log("serverlist:[" + serverList[i] + "]---" + "usernums:[" + usernums[i] + "]");
                                var server = serverList[i].split(":");
                                if (server[0] !== "FrontServer") {
                                    continue;
                                }
                                if (usernums[i] < max) {
                                    //分配规则 填满一个服务器再填下一个
                                    chooseserverindex = i;
                                    //log.info("ipport:" + serverList[i]);
                                    //var login = new socketclient(ipport[1],ipport[0],50);
                                    redis.lpush(REDIS_KEY_ONLINE_USER_LIST + serverList[i], uid, function () {
                                        //向长连接服务器请求uuid
                                        var rpcServer = rpcManager.getRpcByServerId(serverList[i]);
                                        if (!rpcServer) {
                                            console.log('=Err==serverList[i]: %s ==> Code: 13 <==', serverList[i]);
                                            return res.end(JSON.stringify({code: 13}));  /// 未连接到FrontServer
                                        }
                                        rpcServer.getMethod("login")(uid, function (uuid) {
                                            if (uuid) {
                                                ////游戏公告
                                                /*var result = {code: 0, uuid: uuid, server: server[1] + ":" + server[2], uid: uid,link:global.noticeInfo,functionKey:functionKey};
                                                 res.end(JSON.stringify(result));*/
                                                ////
                                                var result = {code: 0, uuid: uuid, server: server[1] + ":" + server[2], uid: uid};
                                                console.log('----------------------result', result);
                                                res.end(JSON.stringify(result));
                                            } else {
                                                res.end(JSON.stringify({code: 3, uuid: 0, server: null, uid: uid}));
                                            }
                                        });
                                    });
                                    break;
                                }
                            }
                            if (chooseserverindex < 0) {
                                //服务器达到承载上限
                                var result = {code: 4, uuid: "", server: null, uid: 0};
                                //log.info(result);
                                res.end(JSON.stringify(result));
                            }
                        });
                    });
                });
                //});
            });
        });
    });


}
//游客注册
app.get("/fish4/guestRegister", function(req, res) {
    console.log('----------------------guestRegister req.query.macStr',req.query.macStr);
    //客户端版本号与服务器版本号对比
    if (checkVer(req.query.ver, res)) {
        //get enough param
        if (req.query !== undefined && req.query.macStr !== undefined) {
            redis.hgetall(REDIS_KEY_USER_ACCOUNT + ":" + req.query.macStr, function(err, obj) {
                console.log('=====>>> err, obj: ',err, obj);
                if (err || err != undefined) {
                    res.end(JSON.stringify({code: 1}));
                    return;
                }

                if (obj.guestUid != undefined) {
                    //console.log('-----------obj',obj);
                    //user existed
                    redis.hgetall(REDIS_KEY_USER_INFO + obj.guestUid, function (err, result) {
                        //console.log('-----------result',result);
                        //console.log('===REDIS_KEY_USER_INFO + obj.uid==>>> err, result: ', err, result);
                        var resultInfo = {guestid: result.guestid, uid: result.uid, showid: result.outsideUuid, numId: result.account,guestNew:0};
                        //console.log('===REDIS_KEY_USER_INFO + obj.uid==>>> resultInfo ', resultInfo);
                        res.end(JSON.stringify(resultInfo));
                    });
                } else {
                    //create guest account
                    initGuest(req.query, function(result) {
                        console.log('init Guest 1');
                        res.end(result);
                    });
                }
            });
        } else {
            res.end(JSON.stringify({code: 2}));
            return;
        }
    }
});
/*//游客注册
app.get("/fish4/guestRegister", function(req, res) {
    //console.log('----------------------guestRegister', req.query);

    //客户端版本号与服务器版本号对比
    if (checkVer(req.query.ver, res)) {
        //get enough param
        if (req.query !== undefined ) {
            initGuest(req.query, function(result) {
                console.log('init Guest 1');
                res.end(result);
            });
        } else {
            console.log('----------------------guestRegister3');
            res.end(JSON.stringify({code: 2}));
            return;
        }
    }
});*/
//选择服务器
app.get('/fish4/chooseServer', function (req, res) {
    //console.log('----------------chooseServer',req.query);
    //客户端版本号与服务器版本号对比
	if (checkVer(req.query.ver, res)) {
        login(req, res);
	}
});

//正式用户注册
app.get("/fish4/userRegister", function (req, res) {
    //console.log('----------------userRegister', req.query);
    //客户端版本号与服务器版本号对比
	if (checkVer(req.query.ver, res)) {
	    var account = req.query.account;
	    var password = req.query.password;
	    console.log('----------------account, password', account, password);

        //检查用户名和密码内容的合法性
	    for (var i = 0; i < account.length; i++) {
	        if (account.charCodeAt(i) < 48 
                || (57 < account.charCodeAt(i) && account.charCodeAt(i) < 65) 
                || (90 < account.charCodeAt(i) && account.charCodeAt(i) < 97) 
                || account.charCodeAt(i) > 122) {
	            res.end(JSON.stringify({code: 3}));
	            return;
	        }
	    }
	    /*for (var i = 0; i < password.length; i++) {
	        if (password.charCodeAt(i) < 48 
                || (57 < password.charCodeAt(i) && password.charCodeAt(i) < 65) 
                || (90 < password.charCodeAt(i) && password.charCodeAt(i) < 97) 
                || password.charCodeAt(i) > 122) {
	            res.end(JSON.stringify({code: 4}));
	            return;
	        }
	    }*/

        //检查用户名和密码长度的合法性
	    if (account.length * 1 < 6 || account.length * 1 > 12) {
	        res.end(JSON.stringify({code: 6}));
	        return;
	    }

	    /*if (password.length * 1 < 6 || password.length * 1 > 12) {
	        res.end(JSON.stringify({code: 7}));
	        return;
	    }*/
        redis.get(account, function (err, password) {
            console.log('---------------userRegister+password', password);
            if (err || err != undefined || password != null) {
                res.end(JSON.stringify({code: 2}));
                return;
            }
            initPlayer(req.query, function (result) {
                console.log('init player 1');
                res.end(result);
            });
        });
	    /*if (req.query !== undefined && req.query.macStr !== undefined) {
	        redis.hgetall(REDIS_KEY_USER_ACCOUNT + ":" + req.query.macStr, function (err, obj) {
	            //console.log('=====>>> err, obj: ',err, obj);
	            if (err || err != undefined) {
	                res.end(JSON.stringify({code: 1}));
                    return;
	            }
	            redis.get(account, function (err, password) {
	                console.log('---------------userRegister+password', password);
	                if (err || err != undefined || password != null) {
	                    res.end(JSON.stringify({code: 2}));
                        return;
	                }
	                initPlayer(req.query, function (result) {
	                    console.log('init player 1');
	                    res.end(result);
	                });
	            });
	        });
	    } else {
	        res.end(JSON.stringify({code: 2}));
            return;
	    }*/
	}
});

//游客账号和新注册账号合并
app.get('/fish4/accountMerge', function (req, res) {
    //console.log('----------------accountMerge');
    var account = req.query.account;
    var password = req.query.password;
    var guestid = req.query.guestid;
    var macStr = req.query.macStr;
    /*redis.get(account,function (err,password){
        if(err || err != undefined||password != null){
            res.end(JSON.stringify({code: 1}));return;
        }
    });*/
    /*redis.set(account,password, function () {
    });*/
    redis.get(REDIS_KEY_USER_TO_UID + guestid, function (err,uid) {
        /*if(err || err != undefined||uid == undefined){
            res.end(JSON.stringify({code:5}));
        }*/
	    redis.set(REDIS_UID_NAME + account, uid, function () {
	        redis.get(REDIS_ID_NAME + guestid, function (err, numId) {
                redis.set(numId, password, function () {
                redis.hdel(REDIS_KEY_USER_ACCOUNT + ":" + macStr,"guestUid", function () {
	                //console.log('----------------password', password);
	                redis.get(REDIS_NUM_ID, function (err, clientID) {
	                    clientID--;
	                    redis.set(REDIS_NUM_ID,clientID, function () {
	                        res.end(JSON.stringify({numId: numId}));
	                    });
	                });
	            });
            });
	        });
	    });
	});
});

/**
 * 判断版本号是否符合
 * @param ver: 客户端上传版本号
 *		  res: 返回结果句柄
 * @code true: 版本号匹配
 * 		 false: 版本号不匹配
 **/
function checkVer(ver, res) {
    console.log('======================= checkVer ver',ver);
    /*var clientVersion = parseInt(ver.replace(/[^0-9]/ig,""));
    var serverVersion = parseInt(config.Version.replace(/[^0-9]/ig,""));
    /!*console.log('======================= checkVer clientVersion',clientVersion);
    console.log('======================= checkVer serverVersion',serverVersion);*!/
    if (!clientVersion || (clientVersion < serverVersion)) {
        res.end(JSON.stringify({code: 5}));
        return false;
    } else {
        return true;
    }*/
    if(ver == undefined || typeof (ver) != "string"){
        console.log('--------------------!!!!!!!!! ver',ver);
        res.end(JSON.stringify({code: 5})); //前端没有发送版本号数据或者类型不对
        return false;
    }
    var arrClient = ver.split('.');
    var arrServer = config.Version.split('.');
    if(arrClient[0]*1 > arrServer[0]*1){
        return true;
    }else if(arrClient[0] == arrServer[0]){
        if(arrClient[1]*1 > arrServer[1]*1){
            return true;
        }else if(arrClient[1] == arrServer[1]){
            if(arrClient[2]*1 > arrServer[2]*1){
                return true;
            }else if(arrClient[2] == arrServer[2]){
                if(arrClient[3]*1 >= arrServer[3]*1){
                    return true;
                }else {
                    res.end(JSON.stringify({code: 5}));
                    return false;
                }
            }else {
                res.end(JSON.stringify({code: 5}));
                return false;
            }
        }else {
            res.end(JSON.stringify({code: 5}));
            return false;
        }
    }else {
        res.end(JSON.stringify({code: 5}));
        return false;
    }

}

var INIT_GOLD = 10;//初始金币//600000
var INIT_GEM = 10;//初始宝石

/**
 * 初始化一个玩家
 * @param info 传入请求的query
 * */
function initPlayer(info, cb) {
    //console.log('======================= step1,info: ',info);
    var nickname = info.nickname;
    var channel = info.channel;
    var headImage = info.headimage;
    var macStr = info.macStr;
    var account = info.account;
    var password = info.password;
    var name = nickname.indexOf('?');
    if(name > -1 || nickname == undefined || nickname == null){
        nickname = nickNameGet.getRandomNickname();
    }
    redis.get(REDIS_NUM_ID, function (err, clientID) {
        console.log('----------------------clientID ', clientID);
        if (err) {
            cb(JSON.stringify({code : 8}));
        }
        if (clientID == null) {
            clientID = 100000000;
        }
        redis.incr(REDIS_KEY_USER_COUNTER, function (err, count) {
            var userSkill = {};
            for (var i in skillInfo) {
                userSkill[i] = skillInfo[i].cost;
            }
            var skins = {};
            var curSkinId = 0;
            for (var key in skin) { /// 只选一个
                skins[key] = 1;
                curSkinId = key *1;
                break;
            }
            var guestUuid = uuid.v1(); //游客唯一id
            var internalUuid = uuid.v1(); //用户唯一id
            var outsideUuid = clientID; //玩家可见id
            var type = 0;
            console.log('======================= step2, count, guestUuid, internalUuid: ', count, guestUuid, internalUuid);
            redis.set(REDIS_KEY_USER_TO_UID + guestUuid, internalUuid, function () {
                var obj = JsonUser;
                obj.uid     	=	 internalUuid;
                obj.channel	    =	 channel;
                obj.headImage	=	 headImage;
                obj.outsideUuid	=	 outsideUuid;
                obj.nickname	=	 nickname;
                obj.account	    =	 account;
                obj.password	=	 password;
                // 更为json 默认值了
                obj.gold	    =	 global.other[1].initial_gold;
                //obj.gem	        =	 INIT_GEM;
                obj.coupon	    =	 0;
                obj.skills	    =	 JSON.stringify(userSkill);
                obj.curSkinId   =	 curSkinId;
                obj.unlockSkins =	 JSON.stringify(skins);
                obj.registerTime  = Date.now();

                console.log('======================= step3,internalUuid ',internalUuid);
                redis.hmset(REDIS_KEY_USER_INFO + internalUuid, obj, function (err, result) {
                    //console.log(JSON.stringify(arguments));
                    redis.set(REDIS_KEY_OUT2IN + clientID, internalUuid, function () {
                        //console.log(JSON.stringify(arguments));
                    });
                    /// xiahou add 8/15 修改昵称时需要做处理
                    var newStr = '';
                    for (var i = 0; i < nickname.length; i++) {
                        newStr += '\\u' + nickname.charCodeAt(i).toString(16);
                    }
                    redis.set(REDIS_KEY_NAME + newStr, internalUuid, function () {
                        console.log('=====12123======>>>>> ',REDIS_KEY_NAME + newStr, nickname);
                    });
                    redis.set(REDIS_UID_NAME + account, internalUuid, function () {
                    });
                    redis.set(REDIS_UID_NAME + outsideUuid, internalUuid, function () {
                    });
                    /*redis.get(REDIS_ID_NAME + macStr, function (err,numId) {
                        console.log('--------------numId',numId);
                        if(numId == null){
                            type = 1;
                        }
                        redis.get(numId, function (err,password) {
                            console.log('--------------password',password);
                            if(password != undefined){
                                type = 1;
                            }
                        });
                    });*/
                    redis.set(account, password, function () {
                    });

                    if(macStr !== undefined) {
                        console.log('======================= step4 ');
                        /// 不存在则插入Redis中
                        redis.hmset(REDIS_KEY_USER_ACCOUNT + ":" + macStr, {playerUid: internalUuid}, function () {
                            //console.log('===REDIS_KEY_USER_ACCOUNT +":"+ macStr==>>> macStr, internalUuid: ',macStr, internalUuid);
                            console.log('----------------------initPlayer macStr ',macStr);
                            redis.get(REDIS_ID_NAME + macStr, function (err, numId) {
                                //console.log('--------------numId',numId);
                                if (numId == null) {
                                    type = 1;       //后端清库前端不需要弹合并弹窗
                                }
                                redis.get(numId, function (err, password) {
                                    /*console.log('--------------password',password);
                                    console.log('--------------typeof password',typeof password);*/
                                    if (password != "") {
                                        type = 1;  //已经合并过前端不需要弹合并弹窗
                                    }
                                    var result = {guestid: guestUuid, uid: internalUuid, showid: outsideUuid, type: type};
                                    //console.log('======================= step5result ',result);
                                    clientID++;
                                    redis.set(REDIS_NUM_ID, clientID, function () {
                                        cb(JSON.stringify(result));
                                    });
                                });
                            });
                            /*var result = {guestid: guestUuid, uid: internalUuid, showid: outsideUuid,type:type};
                            cb(JSON.stringify(result));*/
                        });
                    } else {
                        console.log('======================= step5 ');
                        cb(JSON.stringify({code : 9}));   //没有mac地址
                        /*var result = {guestid: guestUuid, uid: internalUuid, showid: outsideUuid, type: 1};
                        clientID++;
                        redis.set(REDIS_NUM_ID,clientID, function () {
                            cb(JSON.stringify(result));
                        });*/
                    }
                });
            });
        });
    });

}

/**
 * 创建一个游客账号
 * @param info: url参数列表
 *        cb: 回调函数
 **/
function initGuest(info, cb) {
    console.log('------------------------------initGuest');
    var nickname = info.nickname;
    var channel = info.channel;
    var headImage = info.headimage;
    //var FBheadImage = info.FBheadImage;
    var macStr = info.macStr;
    var password = undefined;
    //处理客户端传来的名字乱码
    var name = nickname.indexOf('?');
    if(name > -1 || nickname == undefined || nickname == null){
        nickname = nickNameGet.getRandomNickname();
    }

    redis.get(REDIS_NUM_ID, function (err,clientID) {
        console.log('======================= clientID ', clientID);
        if (err) {
            cb(JSON.stringify({code: 8}));
        }
        if (clientID == null) {
            clientID = 100000000;
        }
        var account = clientID;
    	redis.incr(REDIS_KEY_USER_COUNTER, function (err, count) {
	        var userSkill = {};
	        for (var i in skillInfo) {
	            userSkill[i] = skillInfo[i].cost;
	        }
	        var skins = {};
	        var curSkinId = 0;
	        for (var key in skin) { /// 只选一个
	            skins[key] = 1;
	            curSkinId = key * 1;
	            break;
	        }
	        var guestUuid = uuid.v1(); //游客唯一id
	        var internalUuid = uuid.v1(); //用户唯一id
	        //var outsideUuid = count; //玩家可见id
	        var outsideUuid = account;  //数字账号作为显示
	        console.log('======================= step2,count,guestUuid,internalUuid: ',count,guestUuid,internalUuid);
	        redis.set(REDIS_KEY_USER_TO_UID + guestUuid, internalUuid, function () {
	            var obj = JsonUser;
	            obj.uid     	=	 internalUuid;
                obj.guestid     =	 guestUuid;
	            obj.channel	    =	 channel;
	            obj.headImage	=	 headImage;
                obj.FBheadImage	=	 "";
	            obj.outsideUuid	=	 outsideUuid;
	            obj.nickname	=	 nickname;
	            obj.account	    =	 account;
	            obj.password	=	 password;
	            // 更为json 默认值了
	            obj.gold	    =	 global.other[1].initial_gold;
	            //obj.gem	        =	 INIT_GEM;
	            obj.coupon	    =	 0;
	            obj.skills	    =	 JSON.stringify(userSkill);
	            obj.curSkinId   =	 curSkinId;
	            obj.unlockSkins =	 JSON.stringify(skins);
                obj.registerTime  = Date.now();
	            console.log('======================= step3 ');
	            redis.hmset(REDIS_KEY_USER_INFO + internalUuid, obj, function (err, result) {
	                //console.log(JSON.stringify(arguments));
	                redis.set(REDIS_KEY_OUT2IN + clientID, internalUuid, function () {
	                    //console.log(JSON.stringify(arguments));
	                });
	                /// xiahou add 8/15 修改昵称时需要做处理
	                var newStr = '';
	                for (var i = 0; i < nickname.length; i++) {
	                    newStr += '\\u' + nickname.charCodeAt(i).toString(16);
	                }
	                redis.set(REDIS_KEY_NAME + newStr, internalUuid, function () {
	                    console.log('=====12123======>>>>> ',REDIS_KEY_NAME + newStr, nickname);
	                });
	                redis.set(REDIS_UID_NAME + account,internalUuid, function () {
	                });
	                redis.set(account,password, function () {
	                });
	                redis.set(REDIS_ID_NAME + guestUuid,account, function () {
	                });
	                redis.set(REDIS_ID_NAME + macStr,account, function () {
	                    console.log('-----------------macStr',macStr);
	                });
	                if (macStr !== undefined) {
	                    console.log('======================= step4 ');
	                    /// 不存在则插入Redis中
	                    redis.hmset(REDIS_KEY_USER_ACCOUNT +":"+ macStr, {guestUid: internalUuid}, function () {
	                        //console.log('===REDIS_KEY_USER_ACCOUNT +":"+ macStr==>>> macStr, internalUuid: ',macStr, internalUuid);
	                        var result = {guestid: guestUuid, uid: internalUuid, showid: outsideUuid,numId:account,guestNew:1};
	                        clientID++;
	                        redis.set(REDIS_NUM_ID,clientID, function () {
                                cb(JSON.stringify(result));
	                        });
	                    });
	                }
					else {
	                    console.log('======================= step5 ');
                        cb(JSON.stringify({code: 9})); //没有mac地址
	                    /*var result = {guestid: guestUuid, uid: internalUuid, showid: outsideUuid, numId:account};
	                    clientID++;
	                    redis.set(REDIS_NUM_ID,clientID, function () {
	                        cb(JSON.stringify(result));
	                    });*/
	                }
	            });
	        });
	    });
	});
}

function login(req, res) {
    var account = req.query.account;
    console.log('GateServer.main.login: entered. account password:', account,req.query.password);
    var now = Date.now();
    var nowDay = Math.floor(Date.now()/1000/60/60/24);
    redis.get(account, function (err,password) {
        if(err || err != undefined){
            res.end(JSON.stringify({code: 5}));return;
        }
        if(password == null){
            res.end(JSON.stringify({code: 6}));return;
        }
        if(req.query.password != password){
            res.end(JSON.stringify({code: 7}));return;
        }
        ////解决相同游客账号不同服登录问题，等前端加上mac地址之后再启用
        /*if(password == ""){
            redis.get(REDIS_ID_NAME + req.query.macStr, function (err,numId) {
                if(numId != account){
                    res.end(JSON.stringify({code: 9}));return;
                }
            });
        }*/

        redis.get(REDIS_UID_NAME + account, function (err,uuid) {
            var uid = uuid;
            //账号封存
            redis.hgetall(DBKEY + uid, function (err, reply) {
                if (err || !reply || Object.keys(reply).length <= 0) {
                    logger.err("GateServer.main.login: error to get db or account");
                    res.end(JSON.stringify({code: 12}));//查库错误或账号数据错误
                    return;
                }

                if(now < reply.endTime*1 ){
                    res.end(JSON.stringify({code: 11}));return;  //账号被封
                    return;
                }

                ////功能按键开关功能
                //redis.hgetall(REDIS_FUNCTION_KEY, function (err,functionKey) {
                var user = session.getUser(uid);
                if(user) {
                    res.end(JSON.stringify({code: 8}));return;
                }
                //var uid = req.query.uid;//原本由前端传过来改为通过用户名和密码查库后得到
                //log.info("login:" + uid);
                var isRobot = req.query.isrobot;
                //找user记录
                redis.hgetall(REDIS_KEY_USER_INFO + uid, function (err, obj) {
                    if (!obj) {
                        //log.info("empty!!!");
                        return res.end(JSON.stringify({code: 1, uuid: 0, server: null, uid: uid}));
                    }
                    //如果有user ||   lrange 0是第一个元素  -1是最后一个元素
                    redis.lrange(REDIS_KEY_ONLINE_SERVER, 0, -1, function (err, serverList) {
                        if (serverList.length == 0) {
                            //长连接服务器列表是空的
                            res.end(JSON.stringify({code: 2, uuid: 0, server: null, uid: uid}));
                            return;
                        }
                        serverList.sort();
                        var len = serverList.length;

                        var script = "return {";
                        var arr = [];
                        for (var i in serverList) {
                            var index = parseInt(i) + 1;
                            script += "redis.call('llen',KEYS[" + index + "]),"
                        }
                        script = script.substr(0, script.length - 1) + "}";

                        arr.push(script, len);
                        for (var i in serverList) {
                            arr.push(REDIS_KEY_ONLINE_USER_LIST + serverList[i]);
                        }

                        logger.info("GateServer.main.login: script for redis \n" + arr.toString());

                        redis.eval(arr, function (err, _usernums) {
                            //usernums 对应每个服务器的用户数量(大概)
                            //========================临时措施
                            var usernums = [];
                            for (var serIndex = 0; serIndex < len; serIndex++) {
                                if (_usernums !== undefined && _usernums[serIndex] != undefined) {
                                    usernums[serIndex] = _usernums[serIndex];
                                } else {
                                    usernums[serIndex] = 0;
                                }
                            }
                            //==============================
                            var chooseserverindex = -1;
                            var max = 7000;  //单服务器人数上限
                            if (isRobot) {
                                max = 5000;
                            }

                            for (var i = 0; i < serverList.length; i++) {
                                logger.info("GateServer.main.login: serverlist:[" +serverList[i] +"] <->" +"usernums:[" +i +"]");
                                var server = serverList[i].split(":");
                                if (server[0] !== "FrontServer") {
                                    continue;
                                }
                                if (usernums[i] < max) {
                                    //分配规则 填满一个服务器再填下一个
                                    chooseserverindex = i;
                                    //log.info("ipport:" + serverList[i]);
                                    //var login = new socketclient(ipport[1],ipport[0],50);
                                    redis.lpush(REDIS_KEY_ONLINE_USER_LIST + serverList[i], uid, function () {
                                        logger.info('GateServer.main.login: lpush uid:', JSON.stringify(uid));
                                        //向长连接服务器请求uuid
                                        var rpcServer = rpcManager.getRpcByServerId(serverList[i]);
                                        if (!rpcServer) {
                                            logger.err('GateServer.main.login: error %s ==> Code: 13 <==', serverList[i]);
                                            return res.end(JSON.stringify({code: 13}));  /// 未连接到FrontServer
                                        }
                                        rpcServer.getMethod("login")(uid, function (uuid) {
                                            if (uuid) {
                                                ////游戏公告
                                                /*var result = {code: 0, uuid: uuid, server: server[1] + ":" + server[2], uid: uid,link:global.noticeInfo,functionKey:functionKey};
                                                 res.end(JSON.stringify(result));*/
                                                ////
                                                var result = {code: 0, uuid: uuid, server: server[1] + ":" + server[2], uid: uid};
                                                console.log('GateServer.main.login: result: ', result);
                                                res.end(JSON.stringify(result));
                                            } else {
                                                res.end(JSON.stringify({code: 3, uuid: 0, server: null, uid: uid}));
                                            }
                                        });
                                    });
                                    break;
                                }
                            }
                            if (chooseserverindex < 0) {
                                //服务器达到承载上限
                                var result = {code: 4, uuid: "", server: null, uid: 0};
                                //log.info(result);
                                res.end(JSON.stringify(result));
                            }
                        });
                    });
                });
                //});
            });
        });
    });

}


require("../util/SetupServer.js")(SERVER_ID, redis, rpcManager,
    function (rType) {
        return rType === "FrontServer","GateServer","RoomServer";
    }, MASTER_INFO);

process.on('uncaughtException', function (err) {
    //打印出错误
    logger.err(err.stack || err.message);
});

//机器人数据初始化
require("../dao/robotDao").init(200);


