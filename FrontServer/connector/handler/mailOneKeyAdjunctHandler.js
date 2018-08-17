/**
 *一键领取附件
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var mailDao = require('../../../dao/mailDao');

var mailState = {
    UNREAD : 1
    ,READ : 2
}

handlerMgr.handler(NID.NI_CS_MAIL_ONEKEY_ADJUNCT,function(packetId, param, next){
    var resClient = {err: 0, result: 0};
    var user = param.user();
    if(!user || user == undefined){
        resClient.err = 1;
        next(1, NID.NI_SC_MAIL_ONEKEY_ADJUNCT, resClient); return;
    }
    var selfMails = user.contMng.mails.m_Array;
    if(selfMails == undefined || selfMails.length <= 0){
        resClient.err = 2;
        next(1, NID.NI_SC_MAIL_ONEKEY_ADJUNCT, resClient);return;
    }

    /// 找出未领取的邮件
    var t_gold = user.getValue("gold") *1;
    var t_gem = user.getValue("gem") *1;
    var t_glory = user.getValue("glory") *1;
    var totalItemList = [];
    for(var m = 0; m < selfMails.length; m++ ){
        var tempMail = selfMails[m].data;
        if(tempMail.isAdjunct <= 0 && tempMail.itemList != undefined && tempMail.itemList.length > 0){
            var tempItems = selfMails[m].getValue("itemList") || [];
            for(var i = 0; i< tempItems.length; i++){
                if(tempItems[i] == undefined){ continue; }
                var g_prop = global.prop[tempItems[i].goodId];
                if(g_prop == undefined){ continue; }

                if(tempItems[i].goodId *1 == 1002){
                    t_gold += tempItems[i].goodNum*1 || 0;
                }
                else if(tempItems[i].goodId *1 == 1003){
                    t_gem += tempItems[i].goodNum*1 || 0;
                }
                else if(tempItems[i].goodId *1 == 1004){
                    t_glory += tempItems[i].goodNum*1 || 0;
                }
                else {
                    totalItemList.push({id: tempItems[i].goodId, type: g_prop.exchange_type, num: tempItems[i].goodNum});
                }
            }

            /// 已领取
            selfMails[m].setValue("isAdjunct", 1);
        }

        if(tempMail.state <= mailState.UNREAD){
            /// 已查看
            selfMails[m].setValue("state",mailState.READ);
        }
    }

    ////物品添加的操作 start
    if(totalItemList.length > 0) {
        user.fillBag(totalItemList);
    }

    //console.log('---4109--NI_SC_MAIL_ONEKEY_ADJUNCT==>',JSON.stringify(totalItemList), t_gold, t_gem, t_glory);
    user.setValue("gold", t_gold);
    user.setValue("gem", t_gem);
    user.setValue("glory", t_glory);
    ////物品添加的操作 end

    mailDao.write(user, function(){});
    user.writeToDb(function(){});
    resClient.result = 1;
    next(null, NID.NI_SC_MAIL_ONEKEY_ADJUNCT, resClient);
})
