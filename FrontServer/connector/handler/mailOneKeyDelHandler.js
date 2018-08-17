/**
 *一键删除邮件
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var mailDao = require('../../../dao/mailDao');

handlerMgr.handler(NID.NI_CS_MAIL_ONEKEY_DEL,function(packetId, param, next){
    var user = param.user();
    var resClient = {err: 0, result: 0};
    if(!user || user == undefined){
        resClient.err = 1;
        next(1, NID.NI_SC_MAIL_ONEKEY_DEL, resClient); return;
    }
    var selfMails = user.contMng.mails.m_Array;
    if(selfMails == undefined || selfMails.length <= 0){
        resClient.err = 2;
        next(1, NID.NI_SC_MAIL_ONEKEY_DEL, resClient);return;
    }

    var isUnAdjunct = false;
    var maxDeleteNum = 200;  ///只判断前maxDeleteNum封邮件
    for(var m = 0; m < maxDeleteNum; m++ ) {
        if(selfMails[m] == undefined){
            continue;
        }
        var tempMail = selfMails[m].data;
        if(tempMail.itemList.length > 0 && tempMail.isAdjunct <= 0){
            isUnAdjunct = true;
            break;
        }
    }

    if(isUnAdjunct == true){
        resClient.err = 3;
        next(1, NID.NI_SC_MAIL_ONEKEY_DEL, resClient);return;
    }
    var delMailKeys = [];
    if(selfMails.length > maxDeleteNum){
        for(var m = 0; m < maxDeleteNum; m++ ) {
            if(selfMails[m] == undefined){
                continue;
            }
            var tempMail = selfMails[m].data;
            delMailKeys.push(tempMail.id);
            selfMails.splice(m, 1);///只删除前maxDeleteNum封邮件
        }
    }else{
        user.contMng.mails.m_Array = [];
    }
    
    mailDao.deleteAllByGuid(user.getUid(), delMailKeys, function(err){
        if(err || err != undefined){
        logger.err("-----mods[110]==>err: "+ err + ",mailIdList: " + JSON.stringify(delMailKeys));
    }});

    resClient.result = 1;
    next(null, NID.NI_SC_MAIL_ONEKEY_DEL, resClient);
})
