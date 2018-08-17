/**
    礼物赠送
 */

var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var redis = require("../../../dao/redis/redisCmd");
var giftConfig = require("../../../Resources/gift");
var bagDao = require("../../../dao/bagDao");
var giftDao = require("../../../dao/giftDao");
var logger = require("../../../common/logHelper").helper;
var REDIS_KEY = "fish4gift:";
var objGift = require('../../../obj/objGift');

handlerMgr.handler(NID.NI_CS_GIFT_GIVE,function(packetId, param, next){
    // 不管是看到谁给谁发礼物，总是站在第一人称角度给别人送礼物
    var user = param.user();    //  赠送玩家信息
    var data = param.data;
    var session = param.session;
    var uid = data.uid;     // 接受礼物玩家id
    var id = user.uid;
    var fid = data.giftId;
    var name = user.getValue("nickname");
    //console.log('*********************************data',data);
    if(user == undefined || session == undefined){
        next(1, NID.NI_SC_GIFT_GIVE, {err:1});
        return;
    }
    if(data == undefined){
        next(1,NID.NI_SC_GIFT_GIVE, {err:2});
        return;
    }
    if(uid == undefined || fid == undefined){
        next(1,NID.NI_SC_GIFT_GIVE, {err:3});
        return;
    }
    //金币不足以购买
    var gold = user.getValue('gold')*1;
    var sellGold = giftConfig[fid]['gift_price']*1;
    if(gold < sellGold){
        next(1, NID.NI_SC_GIFT_GIVE, {err:4});
        return;
    }
    //同一房间广播礼物赠送
    user.rpcTrans('giftGive', [id,uid,fid], function (err, ret) {
        next(null,  NID.NI_SC_GIFT_GIVE, {err:0});
    });

    //扣除金币
    user.setValue('gold',gold - sellGold);
    user.writeToDb();
    var _gold = sellGold * 0.3;
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
    var time = dateY+ "-" +dateM+ "-" +dateD+ " " +dateH+ ":" +dateS+ ":" +dateC;
    var _time = new Date(time).getTime()*1;
    //添加金币
    //玩家如果在线直接操作内存
    var tempUser = session.getUser(uid);
    if(tempUser != undefined){
        tempUser.setValue('gold',tempUser.getValue('gold')*1 + _gold);
        tempUser.writeToDb();
        tempUser.sendMsg(NID.NI_SC_GIFT_REMAIN, {name:name,giftId:fid,time:_time});
        //记录入库
        var gift = new objGift();
        gift.setValue("name",name);
        gift.setValue("giftId",fid);
        gift.setValue("time", _time);
        tempUser.contMng.gift.add(gift);
        giftDao.write(tempUser,function (err,result) {});
    }else{
        redis.hgetall("fish4user:"+uid,function (err, reply) {
            if(reply != undefined){
                var Gold = reply.gold*1 + _gold;
                redis.hset("fish4user:"+uid,"gold",Gold,function (err,res) {});
            }
        });
        //记录入库
        var tempData = {"name":name,"giftId":fid,"time":_time};
        var writeData = {};
        writeData[_time] = JSON.stringify(tempData);
        redis.hmset(REDIS_KEY+uid,writeData,function (err,res) {});
    }

});
