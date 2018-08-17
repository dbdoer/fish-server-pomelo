/**
 *删除邮件
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var mailDao = require('../../../dao/mailDao');


handlerMgr.handler(NID.NI_CS_MAIL_DEL,function(packetId, param, next){

    var user = param.user();
    var data = param.data;
    console.log("-----mods[106]==>data: ", data);
    var resClient = {err: 0, result: 0};
    if(user == undefined || data == undefined || data.id == undefined){
        resClient.err = 1;
        next(1, NID.NI_SC_MAIL_DEL, resClient);return;
    }
    var selfMails = user.contMng.mails.m_Array;
    if(selfMails == undefined || selfMails.length <= 0){
        resClient.err = 2;
        next(1, NID.NI_SC_MAIL_DEL, resClient);return;
    }

    var mailIndex = -1;
    for(var m = 0; m < selfMails.length; m++ ){
        var info = selfMails[m].data;
        if(info != undefined && info.id == data.id){
            mailIndex = m;break;
        }
    }
    // 判断邮件ID是否存在
    if(mailIndex < 0){
        resClient.err = 2;
        next(1, NID.NI_SC_MAIL_DEL, resClient);return;
    }

    selfMails.splice(mailIndex, 1);  /// 根据下标删除
    mailDao.delete(user, data.id, function (){ });
    resClient.result = 1;
    next(null, NID.NI_SC_MAIL_DEL, resClient);

})
