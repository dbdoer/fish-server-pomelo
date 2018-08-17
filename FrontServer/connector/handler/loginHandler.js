/**
 * 用户登录
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var dataParser = require("../../MsgParser.js");
var ObjUser = require("../../../obj/objUser");
var dao = require("../../../dao/mailDao");
var bagDao = require("../../../dao/bagDao");
var giftDao = require("../../../dao/giftDao");
var logger = require("../../../common/logHelper").helper;
var goodsDao = require('../../../dao/goodsDao');
var redis2mysql = require('../../../dao/redis2mysql');
var COMM = require("../../../common/commons");
var prop = require('../../../Resources/prop');
var onlineDao = require("../../../dao/onlineDao");
var redeemCode = require("../../../dao/redeemCodeDao");
var otherLoginLogic = require("../otherLoginLogic");

handlerMgr.handler(NID.NI_CS_LOGIN,function(packetId, param, next){
        var session = param.session;
        var uid = param.data.uid;
        var now = Date.now();
        var resInfo = {code: 0, userInfo: {},dataPropList :[],dataCardList :{},guideStepNum :0,timeNow:"",novicePackage:[],novicePackageTime:"",otherPackage:[]};
        if(!uid || session == undefined || !session){
            resInfo.code = 1;
            next(1, NID.NI_SC_LOGIN, resInfo);
            return;
        }
        /// 先查找session里是否玩家数据
        var temp_session = session.getSessionByUid(uid);
        if(temp_session != undefined && temp_session.length > 0){
            for(var ts =0; ts < temp_session.length; ts++) {
                if(temp_session[ts] == undefined){
                    continue;
                }
                if(!temp_session[ts]._uid || temp_session[ts]._uid == undefined){
                    continue;
                }

                var oldSession = session.getSession(temp_session[ts]._sid);
                if (oldSession != undefined) {
                    var buf = dataParser.buildProtoMsg(NID.NI_SC_ACCOUNT_REPETITION, null, {code: true});
                    oldSession.write(buf);
                    session.deleteSession(temp_session[ts]._sid);
                }
            }
        }
        if(!session.setUid(param.conn._sid, uid)){ //在session中设置uid(添加到conn中)
            resInfo.code = 8;
            console.log("--4101----NI_CS_LOGIN---->resInfo.code = 8");
            next(1, NID.NI_SC_LOGIN, resInfo);
            session.deleteSession(param.conn._sid);
            return;
        }
        //logger.trace("login uid = "+ uid);
        var getBag = function(user){
            var bagItem = user.contMng.bag.m_Array;
            if(bagItem == undefined){
                resInfo.code = 6;
                next(1, NID.NI_SC_LOGIN, resInfo);
                return;
            }
            var bagInfo = [];
            for(var key = 0; key < bagItem.length; key++){
                bagInfo.push(bagItem[key].data);
            }
            return bagInfo;
        }

        var loginProcess = function(){
            var user = new ObjUser();
            user.setUid(uid);
            console.log('----------------------uid', uid);
            user.bindConn(param.conn);
            user.loadFromDb(function(err, info){
                //赠送礼物提示框
                var time = new Date();
                var dateY = time.getFullYear();
                var dateM = time.getMonth() +1;
                var dateD = time.getDate();
                if(dateM < 10){
                    dateM = "0"+dateM;
                }
                if(dateD < 10){
                    dateD = "0"+dateD;
                }
                var Time = dateY+ "-" +dateM+ "-" +dateD;
                var _Time = new Date(Time).getTime()*1;
                var _time = user.getValue('selectTime')*1;
                if(_Time != _time){
                    user.setValue('isChecked',0); //0表未勾选
                    user.writeToDb();
                }
                if(session.setUser(uid, user)){
                    user.writeToDb();
                }
                //取出礼物记录
                var info = [];
                var lastTimeStamp = "";
                giftDao.loadByGuid(user.uid,function (err, result) {
                    if(err || result == undefined || result == null){
                        return;
                    }
                    for(var key in result){
                        info.push(result[key]);
                    }
                    var len = info.length;
                    if(len > 0){
                        lastTimeStamp = info[len-1]["time"];
                        console.log('*********************************lastTimeStamp',lastTimeStamp);
                    }else{
                        lastTimeStamp = "";
                    }
                });
                
                var packageInfo = otherLoginLogic.getPackageInfo(user);
                var novicePackageTime = user.getValue("novicePackageTime");
                console.log("------------------------packageInfo",packageInfo);
                var monthCard   = user.getValue("monthCard")*1;
                var canGet      = user.getValue("canGet")*1;
                var newUser      = user.getValue("newUser")*1;
                //console.log("------------------------newUser",newUser);
                var monthCardDate = user.getValue("monthCardDate")*1;
                if(monthCard > 0){
                    //var canGet = user.getValue("canGet")*1;
                    var monthCardRemain = Math.ceil((monthCardDate - now)/1000/60/60/24);
                    if(monthCardRemain >= 0 && monthCardRemain != monthCard){
                        canGet = 1;
                        monthCard = monthCardRemain;
                        user.setValue("canGet",1);
                        user.setValue("monthCard",monthCardRemain);
                    }
                }
                if(monthCardDate - now <= 0){
                    user.setValue("cardBoxPropRate",0);
                    canGet = 0;
                    user.setValue("canGet",0);
                }
                //user.writeToDb();
                user.loginTime = COMM.timestamp();
                user.loginIP = param.conn.remoteAddress;
                redis2mysql.RedisPushLogin([
                    user.getValue('outsideUuid')
                    ,user.loginIP
                    ,user.loginTime
                    ,1
                    ,user.getValue('gold')
                    ,0
                ]);


                bagDao.load(user, function (err, res) {
                    if(err){
                        resInfo.code = 4;
                        next(1, NID.NI_SC_LOGIN, resInfo);
                        return;
                    }
                    var bagItem = user.contMng.bag.m_Array;
                    if(err || bagItem == undefined){
                        resInfo.code = 5;
                        next(1, NID.NI_SC_LOGIN, resInfo);
                        return;
                    }else {
                        if(user.getValue("newUser")*1 == 0){
                            ////测试用
                            //user.fillMail();
                            ////
                            redis2mysql.RedisPushByUser(user);
                            redis2mysql.RedisPushGoldChangeByUser(user);
                            user.setValue("newUser",1);
                            user.writeToDb(function(){});
                        }
                        user.setValue("loginTime",now);
                        /// =====> sign data manage <===start===
                        var u_signDataIsChange = user.getValue("signDataIsChange");
                        var u_signInTime = user.getValue("signInTime");
                        u_signInTime = new Date(u_signInTime *1000);
                        var nowDate = new Date();
                        //console.log('=4806=====>u_signDataIsChange',u_signDataIsChange,global.signDataIsChange,u_signInTime.getFullYear(),u_signInTime.getMonth());
                        if(/*global.signDataIsChange != u_signDataIsChange *1 ||
                            (nowDate.getFullYear() != u_signInTime.getFullYear() ||
                            nowDate.getMonth() +1 != u_signInTime.getMonth() +1) &&
                            ((nowDate.getDate() == 1 && nowDate.getHours() >= 5) || nowDate.getDate() > 1)*/true){
                            var tempSignData = [];
                            for(var sKey in global.signInfo){
                                tempSignData.push(global.signInfo[sKey]);
                            }
                            var tempTotalSignData = [];
                            for(var tKey in global.totalSignInfo){
                                tempTotalSignData.push(global.totalSignInfo[tKey]);
                            }
                            //console.log('=4806=====>NI_SC_PUSH_SIGN_DATA',Object.keys(tempSignData).length,Object.keys(tempTotalSignData).length);
                            user.sendMsg(NID.NI_SC_PUSH_SIGN_DATA,{signData: tempSignData ,signTotalData: tempTotalSignData});
                            /// 更新后重置玩家的signDataChange字段
                            user.setValue("signDataIsChange",global.signDataIsChange);
                        }
                        /// =====> sign data manage <===end===
                        //console.log('--------------------------userInfo',user.getMsgInfo());
                        console.log('--------------------------new Date()',new Date());
                        console.log('--------------------------new Date().getTime()',new Date().getTime());
                        var t_bag = getBag(user) || [];
                        next(null, NID.NI_SC_LOGIN, {code: 0, userInfo: user.getMsgInfo(),
                            dataPropList :t_bag,
                            dataCardList:{monthCard:monthCard*1,canGet:canGet*1},
                            guideStepNum: user.getValue("guideStep")*1,timeNow:JSON.stringify(Date.now()),novicePackage:packageInfo.arrNovicePackage,novicePackageTime:novicePackageTime,
                            otherPackage:packageInfo.otherPackage,
                            isUpdate:user.getValue("isUpdate")*1,
                            isChecked:user.getValue("isChecked")*1,
                            lastTimeStamp:lastTimeStamp
                        });
                    }
                });
            });

            onlineDao.SetOnline(uid,global.serverId,function(err, reply){});
        }

        var onlineProcess = function() {
            logger.debug("onlineProcess ----------------uid: " + uid);
            //用户信息正常
            onlineDao.GetOnline(uid, function (err, reply) {
                if (!reply) {
                    loginProcess();
                } else {
                    //有用户数据在T之
                    var session = param.session;
                    var rpc = session.getRpcManager().getRpcByRType('TransfeServer');
                    if (rpc == undefined || rpc == null) {
                        resInfo.code = 2;
                        next(1, NID.NI_SC_LOGIN, resInfo);
                        //next(1, NID.NI_SC_LOGIN, {err: "no rpc"});
                        return;
                    }

                    var method = rpc.getMethod("forwardKickUser");
                    if (method == undefined || method == null) {
                        resInfo.code = 3;
                        next(1, NID.NI_SC_LOGIN, resInfo);
                        //next(1, NID.NI_SC_LOGIN, {err: "no rpc function"});
                        return;
                    }

                    method([reply, uid], function () {
                        onlineDao.DelOnline(uid);
                        loginProcess();
                    });
                }
            });
        }

        //在线信息处理
        var _user =        session.getUser(uid);
        if(_user){
            logger.debug("reconnect ----------------uid: " + uid + ",name = " + _user.getValue("nickname"));
            /// =====> sign data manage <===start===
            var nowDate = new Date();
            var u_signInTime = _user.getValue("signInTime");
            u_signInTime = new Date(u_signInTime *1000);
            var u_signDataIsChange = _user.getValue("signDataIsChange");

            //赠送礼物提示框
            var time = new Date();
            var dateY = time.getFullYear();
            var dateM = time.getMonth() +1;
            var dateD = time.getDate();
            if(dateM < 10){
                dateM = "0"+dateM;
            }
            if(dateD < 10){
                dateD = "0"+dateD;
            }
            var Time = dateY+ "-" +dateM+ "-" +dateD;
            var _Time = new Date(Time).getTime()*1;
            var _time = _user.getValue('selectTime')*1;
            if(_Time != _time){
                _user.setValue('isChecked',0); //0表未勾选
                _user.writeToDb();
            }

            //取出礼物记录
            var info = [];
            var lastTimeStamp = "";
            giftDao.loadByGuid(user.uid,function (err, result) {
                if(err || result == undefined || result == null){
                    return;
                }
                for(var key in result){
                    info.push(result[key]);
                }
                var len = info.length;
                if(len > 0){
                    lastTimeStamp = info[len-1]["time"];
                    //console.log('*********************************lastTimeStamp',lastTimeStamp);
                }else{
                    lastTimeStamp = "";
                }
            });

            if(global.signDataIsChange != u_signDataIsChange *1 ||
                (nowDate.getFullYear() != u_signInTime.getFullYear() ||
                nowDate.getMonth() +1 != u_signInTime.getMonth() +1) &&
                ((nowDate.getDate() == 1 && nowDate.getHours() >= 5) || nowDate.getDate() > 1)){
                var tempSignData = [];
                for(var sKey in global.signInfo){
                    tempSignData.push(global.signInfo[sKey]);
                }
                var tempTotalSignData = [];
                for(var tKey in global.totalSignInfo){
                    tempTotalSignData.push(global.totalSignInfo[tKey]);
                }
                _user.sendMsg(NID.NI_SC_PUSH_SIGN_DATA,{signData: tempSignData ,signTotalData: tempTotalSignData});
                /// 更新后重置玩家的signDataChange字段
                _user.setValue("signDataIsChange",global.signDataIsChange);
            }
            /// =====> sign data manage <===end===
            var packageInfo = otherLoginLogic.getPackageInfo(_user);
            var novicePackageTime = _user.getValue("novicePackageTime");

            var monthCard   = _user.getValue("monthCard")*1;
            var canGet      = _user.getValue("canGet")*1;
            var t_bag = getBag(_user) || [];
            next(null, NID.NI_SC_LOGIN, {code: 0, userInfo: _user.getMsgInfo(),
                dataPropList :t_bag,
                dataCardList:{monthCard:monthCard*1,canGet:canGet*1},
                guideStepNum: _user.getValue("guideStep")*1,timeNow:JSON.stringify(Date.now()),novicePackage:packageInfo.arrNovicePackage,novicePackageTime:novicePackageTime,
                otherPackage:packageInfo.otherPackage,
                isUpdate:user.getValue("isUpdate")*1,
                isChecked:user.getValue("isChecked")*1,
                lastTimeStamp:lastTimeStamp
            });
        }else{
            onlineProcess();
        }
    }
)

