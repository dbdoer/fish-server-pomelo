/**
 *邮件功能之获取邮件信息
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var mailDao = require('../../../dao/mailDao');
var COMM = require('../../../common/commons');
var logger = require("../../../common/logHelper").helper;

handlerMgr.handler(NID.NI_CS_GET_MAIL,function(packetId, param, next){

    var user = param.user();
    if(!user){
        next(1, NID.NI_SC_GET_MAIL,{mailList:[]});
        return;
    }
    //logger.debug("-----mods[104]==>data: ");
    mailDao.load(user, function (err, res) {
        var testMail = user.contMng.mails.m_Array;
        if(err || testMail == undefined){
            next(1, NID.NI_SC_GET_MAIL,{mailList:[]});
            return;
        }else {
            var info = [];
            var delMailIdList = [];
            var tempTime = global.other[1].mail_time *1 || 15; ///15天有效期限
            for(var key = 0; key < testMail.length; key++){
                if(Number(testMail[key].data.createTime) + tempTime * 24 * 3600 <= COMM.timestamp()){
                    delMailIdList.push(testMail[key].data.id);
                    continue;
                }
                info.push(testMail[key].data);
            }

            if(delMailIdList.length > 0){
                mailDao.deleteAllByGuid(user.getUid(), delMailIdList, function (err) {
                    if(err || err != undefined){
                        logger.err("-----mods[104]==>err: "+ err + ",mailIdList: " + JSON.stringify(delMailIdList));
                    }
                })
            }
            //logger.debug("-----mods[104]==>info: "+ JSON.stringify(info));
            next(null, NID.NI_SC_GET_MAIL,{mailList:info});
        }
    })

})
