/**
 *查看邮件
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var mailDao = require('../../../dao/mailDao');
var logger = require("../../../common/logHelper").helper;

var mailState = {
    UNREAD : 1,
    READ : 2,
}

handlerMgr.handler(NID.NI_CS_MAIL_CHECK,function(packetId, param, next){
    var resClient = {err: 0, result: 0};
    var user = param.user();
    var data = param.data;
    
    if(user == undefined ||data == undefined || data.id == undefined){
        resClient.err = 1;
        next(1, NID.NI_SC_MAIL_CHECK, resClient); return;
    }
    var selfMails = user.contMng.mails.m_Array;
    if(selfMails == undefined || selfMails.length <= 0){
        resClient.err = 2;
        next(1, NID.NI_SC_MAIL_CHECK, resClient);return;
    }

    logger.debug("-----mods[105]==>selfMails: " + JSON.stringify(selfMails)+ ",id: " + data.id);
    var mailIndex = -1;
    for(var m = 0; m < selfMails.length; m++ ){
        var info = selfMails[m].data;
        if(info!= undefined && info.id == data.id){
            mailIndex = m;break;
        }
    }
    // 判断邮件ID是否存在
    if(mailIndex < 0){
        resClient.err = 2;
        next(1, NID.NI_SC_MAIL_CHECK, resClient);return;
    }
    // 判断是否已读
    if(selfMails[mailIndex].getValue("state") > mailState.UNREAD){
        resClient.err = 3;
        next(1, NID.NI_SC_MAIL_CHECK, resClient);return;
    }

    selfMails[mailIndex].setValue("state", mailState.READ);
    resClient.result = 1;

    mailDao.writeByParam(user.uid, selfMails[mailIndex].data, function(err, res){
        if(err){
            resClient.err = 4;
            next(1, NID.NI_SC_MAIL_CHECK, resClient);return;
        }

        next(null, NID.NI_SC_MAIL_CHECK, resClient);
    })
})
