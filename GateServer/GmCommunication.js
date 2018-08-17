"use strict";
/**
 *   GM通讯
 */

//var redis = require('../dao/redis/redisCmd');
var redis = require("../database/redis").getCluster();


var REDIS_UID_NAME = "fish4uid:";
var userDao = require('../dao/userDao');
var REDIS_NOTICE_LINK = "fish4NoticeLink:";
var REDIS_FUNCTION_KEY = "fish4FunctionKey:";
var REDIS_MAIL_STORAGE = "fish4MailStorage:";
var DBKEY = "fish4user:";
var REDIS_GOODS_EXCHANGE = "fish4goods:";
var REDIS_KEY_OUT2IN = "out2in:";
//var REDIS_KEY_USER_INFO = "fish4user:";
var REDIS_PROFIT_STORAGE = "fish4Profit"
var CLOSE_SERVER = "fish4CloseServer";

var bagDao = require("../dao/bagDao");
var rpcManager = require("../rpc/RpcManager.js")();
var prop = require("../Resources/prop");
var logger = require("../common/logHelper").helper;
var pictureList = require("../ProcessDB/selectOrInsert")();
var nodeExcel = require('excel-export');
var async = require('async');
var fs = require('fs');


module.exports = function (app,rpcManager) {
    return new GmCommunication(app,rpcManager);
};


function GmCommunication(app,rpcManager) {
    this.app = app;
    this.rpcManager = rpcManager;
    this.appGM();
}
GmCommunication.prototype.init = function () {

}

GmCommunication.prototype.appGM = function () {
    //数值查询
    /*var data = this.getRoomServerInfo(1112001);
    console.log('----------------------data',data);*/
    var self = this;
    this.app.get('/fish4/coefficientCheck', function (req, res) {
        console.log('----------------------fish4/coefficientCheck');
        var now = Date.now()/1000;
        if(!req.query.roomType || req.query.roomType == undefined){
            res.end(JSON.stringify({code: 1}));
            return;
        }
        var roomType = req.query.roomType;
        console.log('----------------------roomType',roomType);
        var rpcTS = self.rpcManager.getRpcByRType("RoomServer");
        if (rpcTS) {
            var methodTS = rpcTS.getMethod('getRoomServerData');
            if (methodTS) {
                //console.log('==sendTransfeServerByEvent==>111111111111111');
                methodTS(roomType, function (err, result) {
                    console.log('------------------------result', result);
                    if (err != undefined || err != null) {
                        console.log('==TransfeServer.sendFullServerNotice()=====>err: ', err);
                        res.end(JSON.stringify({code: 2}));
                    }
                    res.end(JSON.stringify({code: 0,roomType:roomType,time:now,data:result}));
                });
                //return true;
            }
        }
        //res.end(JSON.stringify({code: 1,roomType:0,time:0,data:""}));
    });


//总盈利值查询
    this.app.get('/fish4/totalProfit', function (req, res) {
        console.log("-----------------------totalProfit");
        if(!req.query.startTime || req.query.startTime == undefined){
            res.end(JSON.stringify({code: 1}));
            return;
        }
        if(!req.query.endTime || req.query.endTime == undefined){
            res.end(JSON.stringify({code: 2}));
            return;
        }
        var startTime = eval('('+req.query.startTime+')')*1000;
        var endTime = eval('('+req.query.endTime+')')*1000;
        var info = {};
        /*redis.keys(REDIS_PROFIT_STORAGE + "*" , function (err,ret) {
         console.log("-----------------------ret",ret);
         for(var i = 0;i < ret.length; i++){
         var time = ret[i];
         redis.hgetall(ret[i], function (err,result) {
         res.end(JSON.stringify({code: 0,time:time,profit:result}));
         });
         }

         });*/
        redis.hgetall(REDIS_PROFIT_STORAGE, function (err,result) {
            console.log("-----------------------result",result);
            for(var key in result){
                if(startTime*1 <= JSON.parse(key)*1&&JSON.parse(key)*1 <= endTime*1){
                    info[key]=result[key];
                    console.log("-----------------------info00");
                }
            }
            console.log("-----------------------info",info);
            res.end(JSON.stringify({code: 0,totalProfit:info}));
        });
    });
    //数值修改
    this.app.get('/fish4/changeCoefficient', function (req, res) {
        if(!req.query.roomType || req.query.roomType == undefined){
            res.end(JSON.stringify({code: 1}));
            return;
        }
        if(!req.query.gmCoefficient || req.query.gmCoefficient == undefined){
            res.end(JSON.stringify({code: 2}));
            return;
        }
        var roomType = eval('('+req.query.roomType+')');
        var gmCoefficient = eval('('+req.query.gmCoefficient+')');
        var rpcTS = self.rpcManager.getRpcByRType("RoomServer");
        if (rpcTS) {
            var methodTS = rpcTS.getMethod('changeRoomServerCoefficient');
            if (methodTS) {
                //console.log('==sendTransfeServerByEvent==>111111111111111');
                methodTS(roomType,gmCoefficient, function (err, result) {
                    console.log('------------------------result', result);
                    if (err != undefined || err != null) {
                        console.log('==TransfeServer.sendFullServerNotice()=====>err: ', err);
                        res.end(JSON.stringify({code: 3,result:result}));
                    }
                    res.end(JSON.stringify({code: 0}));
                });
                //return true;
            }
        }
    });
    //账号封存
    this.app.get("/fish4/accountClosure", function (req, res) {

        console.log('=======req.query.account=',req.query.account);
        console.log('=======req.query.closureTime=',req.query.closureTime);
        console.log('=======req.query.content=',req.query.content);
        if(!req.query){
            res.end(JSON.stringify({code: 1}));
            return;
        }
        if(!req.query.account){
            res.end(JSON.stringify({code: 2}));
            return;
        }
        if(!req.query.content){
            res.end(JSON.stringify({code: 3}));
            return;
        }
        var startTime = Date.now();
        var endTime = req.query.closureTime*60*60*1000 +startTime;
        var data = {endTime:endTime,blockingContent:req.query.content,unblockingContent:""};

        redis.get(REDIS_UID_NAME + req.query.account, function (err,uid) {
            if(err || !uid ){
                res.end(JSON.stringify({code: 4}));
                return;
            }
            /*userDao.loadByGuid(uid, function (err,reply) {
                if(err || reply.endTime > startTime ){
                    res.end(JSON.stringify({code: 5}));    //已封存
                    return;
                }*/
            redis.hgetall(DBKEY + uid,function(err,reply){
                if(err || reply.endTime > startTime ){
                    res.end(JSON.stringify({code: 5}));    //已封存
                    return;
                }
                if(!req.query.closureTime ){
                    res.end(JSON.stringify({code: 6}));
                    return;
                }
                if(!isPositiveNum(req.query.closureTime)){
                    res.end(JSON.stringify({code: 7}));
                    return;
                }
                /*userDao.GmWrite(uid,data, function(err, ret){
                    res.end(JSON.stringify({code: 0}));
                    return;
                });*/
                var writeData = {
                    "endTime" :data.endTime,
                    "blockingContent" :data.blockingContent,
                    "unblockingContent" :data.unblockingContent
                }
                redis.hmset(
                    DBKEY + uid,
                    writeData,
                    function (err, reply) {
                        res.end(JSON.stringify({code: 0}));
                        return;
                    });
            });
        });

    });
    function isPositiveNum(s){//是否为正整数
        var re = /^[0-9]*[1-9][0-9]*$/ ;
        return re.test(s);         //返回true或false来判断是否正确
    }

//账号解封
    this.app.get('/fish4/accountRelease', function (req, res) {
        var data = {endTime:0,blockingContent:"",unblockingContent:req.query.content};
        if(!req.query){
            res.end(JSON.stringify({code: 1}));
            return;
        }
        if(!req.query.account || req.query.account == undefined){
            res.end(JSON.stringify({code: 2}));
            return;
        }
        if(!req.query.content || req.query.content == undefined){
            res.end(JSON.stringify({code: 3}));
            return;
        }
        redis.get(REDIS_UID_NAME + req.query.account, function (err,uid) {
            if(err || !uid || uid == undefined){
                res.end(JSON.stringify({code: 4}));
                return;
            }
            /*userDao.GmWrite(uid,data, function(err, ret){
                res.end(JSON.stringify({code: 0}));
                return;
            });*/
            var writeData = {
                "endTime" :data.endTime,
                "blockingContent" :data.blockingContent,
                "unblockingContent" :data.unblockingContent
            }

            redis.hmset(
                DBKEY + uid,
                writeData,
                function (err, reply) {
                    res.end(JSON.stringify({code: 0}));
                    return;
                });
        });

    });
//功能按键开关
    this.app.get('/fish4/functionKeys', function (req, res) {
        //req.query.data = {battleInvitation:0,propGive:0,shareReward:0}
        if(!req.query.data){
            res.end(JSON.stringify({code: 1}));
            return;
        }
        console.log("----------------functionKeys",req.query.data);
        var data = eval('('+req.query.data+')');
        console.log("----------------data",data);
        if(!data.battleInvitation || !data.propGive || !data.shareReward){
            console.log("----------------code: 2");
            res.end(JSON.stringify({code: 2}));
            return;
        }
        if(data.battleInvitation == undefined || data.propGive == undefined || data.shareReward == undefined){
            res.end(JSON.stringify({code: 3}));
            return;
        }
        redis.hmset(REDIS_FUNCTION_KEY ,data, function () {
            res.end(JSON.stringify({code: 0}));
        });

    });

//游戏公告
    this.app.get('/fish4/gameNotice', function (req, res) {
        //var nowDay = Math.floor(Date.now()/1000/60/60/24);
        var nowDay = Date.now();
        if(!req.query){
            res.end(JSON.stringify({code: 1}));
            return;
        }
        if(!req.query.startTime || req.query.startTime == undefined){
            res.end(JSON.stringify({code: 2}));
            return;
        }
        var time = new Date(req.query.startTime).getTime()+1*24*60*60*1000;
        if(time <= nowDay){
            res.end(JSON.stringify({code: 2}));
            return;
        }
        console.log("---------------------time",time);
        console.log("---------------------nowDay",nowDay);
        var storeTime = JSON.stringify(new Date(req.query.startTime).getFullYear())+JSON.stringify(new Date(req.query.startTime).getMonth()+1)+JSON.stringify(new Date(req.query.startTime).getDate());
        //var storeTime = time/1000/60/60/24;
        console.log("---------------------storeTime",storeTime);
        if(!req.query.id || req.query.id == undefined){
            res.end(JSON.stringify({code: 8}));
            return;
        }
        var id = req.query.id;

        if(!req.query.endTime || req.query.endTime == undefined){
            res.end(JSON.stringify({code: 3}));
            return;
        }
        if(!req.query.link || req.query.link == undefined){
            res.end(JSON.stringify({code: 4}));
            return;
        }
        if(!req.query.content || req.query.content == undefined){//公告文字内容
            res.end(JSON.stringify({code: 5}));
            return;
        }
        if(!req.query.label || req.query.label == undefined){//标签
            res.end(JSON.stringify({code: 6}));
            return;
        }
        if(!req.query.title || req.query.title == undefined){//标题
            res.end(JSON.stringify({code: 7}));
            return;
        }

        redis.hmset(REDIS_NOTICE_LINK + storeTime,id,JSON.stringify({id:id,title:req.query.title,link:req.query.link,content:req.query.content,label:req.query.label,endTime:req.query.endTime}), function (err,uid) {//还要
            res.end(JSON.stringify({code: 0}));
        });
        //global.noticeInfo = {id:id,title:req.query.title,link:req.query.link,content:req.query.content,label:req.query.label,endTime:req.query.endTime};

    });

//系统邮件发送
    this.app.get('/fish4/mailSend', function (req, res) {
        //console.log("---------------sendType,title,content,mailGoods,numId",req.query.sendType,req.query.title,req.query.content,req.query.mailGoods,req.query.numId);
        if(req.query.sendType == undefined){
            res.end(JSON.stringify({code: 1}));
            return;
        }
        if(req.query.content == undefined){
            res.end(JSON.stringify({code: 2}));
            return;
        }
        if(req.query.title == undefined){
            res.end(JSON.stringify({code: 4}));
            return;
        }
        var sendType = req.query.sendType;
        var templeId = 6;
        var tempMail = global.mail[templeId];
        var repContent = [req.query.content];
        //console.log("----------111---------------------repContent",repContent);
        //var mailGoods = req.query.mailGoods;   //req.query.mailGoods = [{goodId: propId, goodNum: propNum},{goodId: propId, goodNum: propNum},{goodId: propId, goodNum: propNum}]
        var tempMailInfo = [];
        var title = req.query.title;

        if(!req.query.mailGoods ||req.query.mailGoods == undefined ||req.query.mailGoods == null){
            //console.log("----------111---------------------mailGoods=undefined");
            var mailGoods = [];
            tempMailInfo.push({
                type: tempMail.mail_type,       //前端通告这个type值来判断是否是GM系统邮件
                templateId: templeId,
                replacement: repContent,
                itemList: mailGoods,
                title:title
            });
            var rpcTS = self.rpcManager.getRpcByRType('TransfeServer');
            if(rpcTS != undefined) {
                var method = rpcTS.getMethod('sendMailInfo');
                if (method != undefined) {
                    if(req.query.numId !== undefined && sendType == 1) {
                        var numId = req.query.numId;
                        redis.get(REDIS_UID_NAME + numId, function (err, uid) {
                            //console.log("----------111---------------------uid",uid);
                            if (err || uid == null) {
                                res.end(JSON.stringify({code: 6}));
                                return;
                            }
                            method({sendType: sendType, mailInfo: tempMailInfo, userInfo: [uid]}, function (err) {
                                if (err) {
                                    res.end(JSON.stringify({code: 7}));
                                    return;
                                }
                                res.end(JSON.stringify({code: 0}));
                                return;
                            });
                        });
                    }
                    else if(req.query.numId == undefined && sendType == 0) {
                        method({sendType: sendType, mailInfo: tempMailInfo, userInfo: []}, function (err) {
                            if (err) {
                                res.end(JSON.stringify({code: 7}));
                                return;
                            }
                            res.end(JSON.stringify({code: 0}));
                            return;
                        });

                    }
                    else {
                        res.end(JSON.stringify({code: 8}));
                        return;
                    }
                }
                else{
                    res.end(JSON.stringify({code: 10}));
                    return;
                }
            }
            else{
                res.end(JSON.stringify({code: 9}));
                return;
            }
        }else {
            var mailGoods = eval('('+req.query.mailGoods+')');
            tempMailInfo.push({
                type: tempMail.mail_type,
                templateId: templeId,
                replacement: repContent,
                itemList: mailGoods,
                title:title
            });
            var rpcTS = self.rpcManager.getRpcByRType('TransfeServer');
            if(rpcTS != undefined) {
                var method = rpcTS.getMethod('sendMailInfo');
                if (method != undefined) {
                    if(req.query.numId !== undefined && sendType == 1) {
                        var numId = req.query.numId;
                        redis.get(REDIS_UID_NAME + numId, function (err, uid) {
                            //console.log("----------111---------------------uid",uid);
                            if (err || uid == null) {
                                res.end(JSON.stringify({code: 6}));
                                return;
                            }
                            method({sendType: sendType, mailInfo: tempMailInfo, userInfo: [uid]}, function (err) {
                                if (err) {
                                    res.end(JSON.stringify({code: 7}));
                                    return;
                                }
                                res.end(JSON.stringify({code: 0}));
                                return;
                            });
                        });
                    }
                    else if(!req.query.numId ||req.query.numId == undefined ||req.query.numId == null){
                        if(sendType == 0){
                            console.log("----------111---------------------sendType",sendType);
                            method({sendType: sendType, mailInfo: tempMailInfo, userInfo: []}, function (err) {
                                if (err) {
                                    res.end(JSON.stringify({code: 7}));
                                    return;
                                }
                                res.end(JSON.stringify({code: 0}));
                                return;
                            });
                        }
                    }
                    else {
                        res.end(JSON.stringify({code: 8}));
                        return;
                    }
                }
                else{
                    res.end(JSON.stringify({code: 10}));
                    return;
                }
            }
            else{
                res.end(JSON.stringify({code: 9}));
                return;
            }
        }

    });
//系统全服通告
    this.app.post('/fish4/fullNotice', function (req, res) {
        console.log("----------fullNotice---------------------req.body",req.body);
        if (req.body.sendType*1 !== 0) {
            res.end(JSON.stringify({code: 1}));
            return;
        }
        if (req.body.content == undefined) {
            res.end(JSON.stringify({code: 2}));
            return;
        }
        var rpcTS = self.rpcManager.getRpcByRType("TransfeServer");
        if (rpcTS != undefined) {
            var methodTS = rpcTS.getMethod('sendFullServerNotice');
            if (methodTS != undefined) {
                console.log('==sendTransfeServerByEvent==>111111111111111');
                methodTS({
                    noticeType: req.body.sendType*1,
                    playerInfo:{uid:"",pos:0,headurl:"",name:""},
                    fishInfo: {fishId:0 ,fishGold:0,matchId:0,rewardGold:0},
                    content: req.body.content
                }, function (err){
                    if(err != undefined|| err != null){
                        console.log('==TransfeServer.sendFullServerNotice()=====>err: ',err);
                        res.end(JSON.stringify({code: 3}));
                        return;
                    }
                    res.end(JSON.stringify({code: 0}));
                });
            }
            else{
                res.end(JSON.stringify({code: 5}));
                return;
            }
        }
        else{
            res.end(JSON.stringify({code: 4}));
            return;
        }
    });
//实物兑换
    /*this.app.get('/fish4/goodsExchange', function (req, res) {
        console.log("--------------req.query",req.query);
        var now = Date.now();
        var storeTime = JSON.stringify(eval('('+req.query.startTime+')')) +"|"+JSON.stringify(eval('('+req.query.endTime+')'));
        console.log("--------------storeTime",storeTime);
        //var storeTime = JSON.stringify(new Date(req.query.time).getFullYear())+JSON.stringify(new Date(req.query.time).getMonth()+1)+JSON.stringify(new Date(req.query.time).getDate());
        if(!req.query){
         res.end(JSON.stringify({code: 1}));
         return;
         }
         if(!req.query.startTime || req.query.startTime == undefined){
         res.end(JSON.stringify({code: 2}));
         return;
         }
        if(!req.query.endTime || req.query.endTime == undefined){
            res.end(JSON.stringify({code: 3}));
            return;
        }
         if(!req.query.link || req.query.link == undefined){
         res.end(JSON.stringify({code: 4}));
         return;
         }

         /!*if(eval('('+req.query.startTime+')') <= now){  //req.query.time = 2016/10/26必须为字符串
         res.end(JSON.stringify({code: 5}));
         return;
         }*!/
        if(!req.query.label || req.query.label == undefined){
            res.end(JSON.stringify({code: 6}));
            return;
        }
        redis.get(REAL_GOODS_ID, function (err,goodsID) {
            if (err) {
                res.end(JSON.stringify({code: 8}));
            }
            if (goodsID == null) {
                goodsID = 5000;
            }
            redis.hset(REDIS_GOODS_EXCHANGE ,goodsID,JSON.stringify({goodsId:goodsID,bullion:eval('('+req.query.bullion+')'),
                useTime:storeTime,label:req.query.label,link:req.query.link}), function () {
                goodsID++;
                redis.set(REAL_GOODS_ID,goodsID, function () {
                    res.end(JSON.stringify({code: 0}));
                });
            });
        });
        

    });*/
    this.app.get('/fish4/purchaseChange', function (req, res) {
        console.log("-------------------req.query.clientID,req.query.money",req.query.clientID,req.query.money);
        redis.get(REDIS_KEY_OUT2IN + req.query.clientID, function (err,uid) {
            //console.log("-------------------uid",uid);
            if (err||uid == null) {
                res.end(JSON.stringify({code: 1}));return;
            }
            redis.hgetall(DBKEY + uid, function (err, resInfo) {
                if (err || resInfo == null) {
                    res.end(JSON.stringify({code: 2}));return;
                }
                var viplevel = resInfo.vipLv *1 || 0;
                var vipNum = resInfo.vipNumber *1 || 0;
                vipNum = vipNum + req.query.money *1;
                var tempSkins = JSON.parse(resInfo.unlockSkins) || {};
                var tempSkills = JSON.parse(resInfo.skills) || {};
                var newSkillId = -1;  ///解锁的技能ID
                for(var i = Object.keys(global.vip).length; i > 0; i--){
                    if(global.vip[i] != undefined && vipNum >= global.vip[i].Price *1){
                        viplevel = i;
                        newSkillId = global.vip[i].skill_id;
                        break;
                    }
                }
                var newSkillInfo = global.skill[newSkillId];
                var arrSkinID = global.getSkinIdByAct(viplevel);
                if(arrSkinID != undefined && arrSkinID.length > 0){
                    /// VIP等级有几率存在一次连升几级
                    for(var a =0; a <arrSkinID.length; a++){
                        if(tempSkins[arrSkinID[a]] != undefined){
                            continue; /// 已经存在的无需再添加
                        }
                        tempSkins[arrSkinID[a]] = 1;
                    }
                }
                /// 是否达到解锁狂暴技能的等级
                var l_key = 0;
                if(newSkillInfo != undefined && tempSkills[newSkillId] == undefined) {
                    for (var sKey in tempSkills) {
                        var oldSkillInfo = global.skill[sKey];
                        if (oldSkillInfo != undefined && oldSkillInfo.kuangbao_energy * 1 > 0 &&
                            oldSkillInfo.kuangbao_energy * 1 < newSkillInfo.kuangbao_energy * 1) {
                            l_key = sKey;
                            break;
                        }
                    }
                    /// 删除原有的狂暴点数 (只能存在一个)
                    delete tempSkills[l_key];

                    /// 记录新的狂暴点数 kuangbao_level
                    tempSkills[newSkillId] = newSkillInfo.kuangbao_energy * 1;
                }
                redis.hmset(DBKEY+uid ,"vipLv",viplevel,"vipNumber",vipNum,"unlockSkins",JSON.stringify(tempSkins), "skills",JSON.stringify(tempSkills),function (err) {
                    console.log("-------------------hmset,err: ", err);
                    res.end(JSON.stringify({code: 0}));
                });
            })

        });
    });
    this.app.get('/fish4/weiXinRecharge', function (req, res) {
        console.log("-----------------------result");
        res.end(JSON.stringify({code: 0}));
    });

    this.app.get('/fish4/pictureActiveGet', function (req, res) {
        //console.log("-----------------------pictureActiveGet");
        pictureList.processActivitySelect(function (err,result) {
            //console.log("-----------------------pictureActiveGet result",result);
            var now = new Date();
            var pictureList = [];
            for (var i = 0; i < result.length; i++) {
                if(new Date(result[i].start).getTime()<now.getTime()&&now<new Date(result[i].stop).getTime()+1*24*60*60*1000){
                    pictureList.push(result[i].image);
                }
            }
            res.end(JSON.stringify({code: 0,pictureList:pictureList}));
        });
    });
    this.app.get('/fish4/pictureNoticeGet', function (req, res) {
        //console.log("-----------------------pictureNoticeGet");
        pictureList.processNoticeSelect(function (err,result) {
            //console.log("-----------------------pictureNoticeGet result",result);
            var now = Date.now();
            var pictureList = [];
            for (var i = 0; i < result.length; i++) {
                if (now > new Date(result[i].start_time.replace(/-/g,  "/")).getTime() && now < new Date(result[i].stop_time.replace(/-/g,  "/")).getTime()+1*24*60*60*1000){
                    pictureList.push(result[i].image);
                }
            }
            res.end(JSON.stringify({code: 0,pictureList:pictureList}));
        });
    });

    this.app.get('/fish4/GetPlayerGuideNumToExcel', function (req, res){
        //console.log("-GetPlayerGuideNumToExcel--->res = ", res.req.headers.host);
        var conf = {};
        conf.cols = [{
            caption:'uid',
            type:'string'
        },{
            caption:'outsideUuid',
            type:'string'
        },{
            caption:'name',
            type:'string'
        },{
            caption:'gudie',
            type:'number'
        }];
        conf.rows = [];
        redis.keys("fish4user:" + "*" , function (err,ret) {
            var count = 0;
            var test = function () {
                return count < ret.length;
            };
            var fn = function (callback) {
                redis.hgetall(ret[count], function (err, rea) {
                    conf.rows.push([rea.uid, rea.outsideUuid, rea.nickname, rea.guideStep]);
                    count++;
                    callback();
                });
            };

            async.whilst(test, fn, function (err) {
                if (err) {
                    console.log("-GetPlayerGuideNumToExcel--->err = ", err);
                }

                var result = nodeExcel.execute(conf);
                var tempName = "";
                if(res.req != undefined && res.req.headers != undefined && res.req.headers.host != undefined){
                    var arrStr = res.req.headers.host.split(':');
                    tempName = arrStr[0] + "_" + arrStr[1];
                }else{
                    var fileNameY = new Date().getFullYear();
                    var fileNameM = new Date().getMonth() + 1;
                    if (fileNameM <= 9) {
                        fileNameM = '0' + fileNameM;
                    }
                    var fileNameD = new Date().getDate();
                    if (fileNameD <= 9) {
                        fileNameD = '0' + fileNameD;
                    }
                    tempName = fileNameY + fileNameM + fileNameD;
                }
                res.setHeader('Content-Type', 'application/vnd.openxmlformats');
                res.setHeader("Content-Disposition", "attachment; filename=" + tempName + "_GuideNum.xlsx");
                res.end(result, 'binary');
            });
        });
    });

    this.app.get('/fish4/SetSignDataToJson', function (req, res) {
        if (req.query == undefined) {
            res.end(JSON.stringify({code: 1}));
            return;
        }
        if (req.query.yearNum == undefined || req.query.monthNum == undefined || req.query.signData == undefined) {
            res.end(JSON.stringify({code: 2}));
            return;
        }
        var tempSign = JSON.parse(req.query.signData);
        var nowDate = new Date();
        var str = {};
        //console.log('====> SetSignDataToJson req.query = ', req.query.yearNum, req.query.monthNum, tempSign);
        if(nowDate.getFullYear() > req.query.yearNum *1){
            res.end(JSON.stringify({code: 3}));
            return;
        }
        if(nowDate.getFullYear() == req.query.yearNum *1 && req.query.monthNum *1 < nowDate.getMonth() +1){
            res.end(JSON.stringify({code: 4}));
            return;
        }
        /// tempSign =[{"goodId":1001,"goodNum":1,"vip":1},{"goodId":1002,"goodNum":2,"vip":2}]
        for(var s = 0; s < tempSign.length; s++){
            if(tempSign[s] == undefined){
                continue;
            }
            str[s+1] = tempSign[s];
        }
        var file = "./Resources/sign" + req.query.yearNum + req.query.monthNum + ".json";
        /// 是否是当月的数据
        if(nowDate.getMonth() +1 == req.query.monthNum *1){
            /// 存在则删除旧文件，直接写新文件
            fs.writeFile(file, JSON.stringify(str), function (err) {
                if (err) {
                    logger.err("==111==> writeFile fail, err = " + err);
                    res.end(JSON.stringify({code: 5}));return;
                }
                
                global.signDataIsChange += 1;
                logger.debug("File Revamp ==> writeFile " + file + " is ok!");
                var rpcFS = self.rpcManager.getRpcByRType("FrontServer");
                if (rpcFS != undefined) {
                    var methodSign = rpcFS.getMethod('sendSignDataToOnlineUsers');
                    if (methodSign != undefined) {
                        //console.log('==sendTransfeServerByEvent==>111111111111111');
                        methodSign("signData", str, function (err, result) {
                            if (err != undefined || err != null) {
                                console.log('==sendSignDataToOnlineUsers==>err: ', err);
                                res.end(JSON.stringify({code: 6,result:result}));return;
                            }
                            res.end(JSON.stringify({code: 0}));
                        });
                        //return true;
                    }
                }
                //res.end(JSON.stringify({code: 0}));
            });
        }
        else {
            fs.readFile(file, "utf8", function (err, data) {
                if ((err && err != undefined) || data == undefined) {
                    /// 说明文件不存在，则自动创建新文件
                    fs.appendFile(file, JSON.stringify(str), function (err) {
                        if (err) {
                            logger.err("appendFile fail, err = " + err);
                            res.end(JSON.stringify({code: 5}));return;
                        }
                        logger.debug("appendFile " + file + " is ok!");
                        res.end(JSON.stringify({code: 0}));
                    });
                } else {
                    /// 存在则删除旧文件，直接写新文件
                    fs.writeFile(file, JSON.stringify(str), function (err) {
                        if (err) {
                            logger.err("File is exist ==> writeFile fail, err = " + err);
                            res.end(JSON.stringify({code: 6}));return;
                        }
                        logger.debug("File is exist ==> writeFile " + file + " is ok!");
                        res.end(JSON.stringify({code: 0}));
                    });
                }
            });
        }
    });

    this.app.get('/fish4/SetTotalSignRewardToJson', function (req, res){
        if (req.query == undefined) {
            res.end(JSON.stringify({code: 1}));
            return;
        }
        if (req.query.yearNum == undefined || req.query.monthNum == undefined || req.query.totalSignData == undefined) {
            res.end(JSON.stringify({code: 2}));
            return;
        }
        var tempTotalSign = JSON.parse(req.query.totalSignData);
        var nowDate = new Date();
        var str = {};
        //console.log('====> SetSignDataToJson req.query = ', req.query.yearNum, req.query.monthNum, tempTotalSign);
        if(nowDate.getFullYear() > req.query.yearNum *1){
            res.end(JSON.stringify({code: 3}));
            return;
        }
        if(nowDate.getFullYear() == req.query.yearNum *1 && req.query.monthNum *1 < nowDate.getMonth() +1){
            res.end(JSON.stringify({code: 4}));
            return;
        }
        /// tempTotalSign =[{"goodId":1001,"goodNum":1,"day":10},{"goodId":1002,"goodNum":2,"day":20}]
        for(var s = 0; s < tempTotalSign.length; s++){
            if(tempTotalSign[s] == undefined || tempTotalSign[s].day == undefined || tempTotalSign[s].day < 0){
                continue;
            }
            str[tempTotalSign[s].day] = tempTotalSign[s];
        }
        var file = "./Resources/signTotalReward" + req.query.yearNum + req.query.monthNum + ".json";
        /// 是否是当月的数据
        if(nowDate.getMonth() +1 == req.query.monthNum *1){
            /// 存在则删除旧文件，直接写新文件
            fs.writeFile(file, JSON.stringify(str), function (err) {
                if (err) {
                    logger.err("==111==> writeFile fail, err = " + err);
                    res.end(JSON.stringify({code: 5}));return;
                }

                global.signDataIsChange += 1;
                logger.debug("File Revamp ==> writeFile " + file + " is ok!");
                var rpcFS = self.rpcManager.getRpcByRType("FrontServer");
                if (rpcFS != undefined) {
                    var methodSign = rpcFS.getMethod('sendSignDataToOnlineUsers');
                    if (methodSign != undefined) {
                        methodSign("signTotalData", str, function (err, result) {
                            if (err != undefined || err != null) {
                                console.log('==sendSignDataToOnlineUsers==>err: ', err);
                                res.end(JSON.stringify({code: 8,result:result}));return;
                            }
                            res.end(JSON.stringify({code: 0}));
                        });
                    }
                }
                //res.end(JSON.stringify({code: 0}));
            });
        }
        else {
            fs.readFile(file, "utf8", function (err, data) {
                if ((err && err != undefined) || data == undefined) {
                    /// 说明文件不存在，则自动创建新文件
                    fs.appendFile(file, JSON.stringify(str), function (err) {
                        if (err) {
                            logger.err("appendFile fail, err = " + err);
                            res.end(JSON.stringify({code: 5}));return;
                        }
                        logger.debug("appendFile " + file + " is ok!");
                        res.end(JSON.stringify({code: 0}));
                    });
                } else {
                    /// 存在则删除旧文件，直接写新文件
                    fs.writeFile(file, JSON.stringify(str), function (err) {
                        if (err) {
                            logger.err("File is exist ==> writeFile fail, err = " + err);
                            res.end(JSON.stringify({code: 6}));return;
                        }
                        logger.debug("File is exist ==> writeFile " + file + " is ok!");
                        res.end(JSON.stringify({code: 0}));
                    });
                }
            });
        }
    });
    this.app.get('/fish4/CloseServer', function (req, res) {
        if(!req.query){
            res.end(JSON.stringify({code: 1}));
            return;
        }
        if(!req.query.closeServer || req.query.closeServer == undefined){
            res.end(JSON.stringify({code: 2}));
            return;
        }
        console.log("-----------------------req.query.closeServer",req.query.closeServer);
        redis.set(CLOSE_SERVER,req.query.closeServer, function (err) {
            if(err){
                res.end(JSON.stringify({code: 3}));
                return;
            }
            res.end(JSON.stringify({code: 0}));
            return;
        });

    });

}



