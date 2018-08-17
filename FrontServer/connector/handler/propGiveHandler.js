/**
 * 道具赠送
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var redis = require("../../../dao/redis/redisCmd");
var prop = require("../../../Resources/prop");
var bagDao = require("../../../dao/bagDao");
var logger = require("../../../common/logHelper").helper;
var REDIS_UID_NAME = "fish4uid:";

handlerMgr.handler(NID.NI_CS_PROP_GIVE,function(packetId, param, next){
    //console.log("----------112------------------------------- ");
    var user = param.user();
    var session = param.session;
    if(user == undefined || user == null || session == undefined){
        next(1, NID.NI_SC_PROP_GIVE, {errCode : 1});
        return;
    }
    var vipLevel = user.getValue("vipLv")*1;
    if(vipLevel < 2){
        next(1, NID.NI_SC_PROP_GIVE, {errCode : 7});  //vip等级不够
        return;
    }
    var bag = user.contMng.bag;
    var name = user.getValue("nickname");
    //var num = 0;
    var tempMailInfo = [];

    var data = param.data;
    if(data == undefined || data == null){
        next(1, NID.NI_SC_PROP_GIVE, {errCode : 2});
        return;
    }

    var propId = data.propId;
    var propNum = data.propNum*1;
    var numId = data.numId*1;
    logger.debug("------4112---------->data: " + data);
    if(prop[propId] == undefined){
        next(1, NID.NI_SC_PROP_GIVE, {errCode: 3});
        return;
    }

    var string = prop[propId].prop_info;
    var _obj = bag.getRealbyGuid(propId);
    if(_obj == null){
        next(1, NID.NI_SC_PROP_GIVE, {errCode: 4});
        return;
    }
    if(_obj.data.propNum*1 < propNum){
        propNum = _obj.data.propNum *1;
    }

    var templeId = 5;
    var tempMail = global.mail[templeId];
    var repContent = [];
    var mailGoods = [];
    var strArr = tempMail.content.split('%s');
    if(strArr.length > 0 && tempMail.mail_type *1 == 2)
    {///有字符替换
        repContent[0] = name;
        repContent[1] = propNum;
        repContent[2] = string;
    }
    mailGoods.push({goodId: propId, goodNum: propNum});
    tempMailInfo.push({
        type: tempMail.mail_type,
        templateId: templeId,
        replacement: repContent,
        itemList: mailGoods
    });
    var rpcTS = session.getRpcManager().getRpcByRType('TransfeServer');
    if(rpcTS != undefined){
        var method = rpcTS.getMethod('sendMailInfo');
        if(method != undefined){
            redis.get(REDIS_UID_NAME + numId, function (err,uid) {
                if(err || uid == null){
                    logger.err("---4112-------err = %s || uid = %s" + err + uid);
                    next(1, NID.NI_SC_PROP_GIVE, {errCode: 5});
                    return;
                }
                method({sendType: 1, mailInfo: tempMailInfo, userInfo: [uid]}, function (err) {
                    if (err) {
                        next(1, NID.NI_SC_PROP_GIVE, {errCode: 6});return;
                    }
                    _obj.data.propNum -= propNum;
                    bagDao.write(user, function(){});
                    next(null, NID.NI_SC_PROP_GIVE, {errCode: 0});
                });
            });
        }else{
            next(1, NID.NI_SC_PROP_GIVE, {errCode: 7});
            return;
        }
    }
    else{
        next(1, NID.NI_SC_PROP_GIVE, {errCode: 8});
        return;
    }
})
