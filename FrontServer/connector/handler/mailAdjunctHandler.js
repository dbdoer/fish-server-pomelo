/**
 *领取邮件附件
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var mailDao = require('../../../dao/mailDao');

handlerMgr.handler(NID.NI_CS_MAIL_ADJUNCT,function(packetId, param, next){

    var user = param.user();
    var data = param.data;
    console.log("-----mods[108]==>data: ", data);
    var resClient = {err: 0, result: 0};
    if(user == undefined || data == undefined || data.id == undefined){
        resClient.err = 1;
        next(1, NID.NI_SC_MAIL_ADJUNCT, resClient);return;
    }

    var selfMails = user.contMng.mails.m_Array;
    if(selfMails == undefined || selfMails.length <= 0){
        resClient.err = 2;
        next(1, NID.NI_SC_MAIL_CHECK, resClient);return;
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
        next(1, NID.NI_SC_MAIL_ADJUNCT, resClient);return;
    }

    if(selfMails[mailIndex].getValue("isAdjunct") > 0){
        resClient.err = 3;
        next(1, NID.NI_SC_MAIL_ADJUNCT, resClient);return;
    }

    var tempItems = selfMails[mailIndex].getValue("itemList");
    if(tempItems == undefined || tempItems.length <= 0){
        resClient.err = 4;
        next(1, NID.NI_SC_MAIL_ADJUNCT, resClient);return;
    }
    ////物品添加的操作 start
    //对邮件道具物品的操作 start
    var arr = [];
    var t_gold = user.getValue("gold") *1;
    var t_gem = user.getValue("gem") *1;
    var t_glory = user.getValue("glory") *1;
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
            arr.push({id: tempItems[i].goodId, type: g_prop.exchange_type, num: tempItems[i].goodNum});
        }
    }
    user.fillBag(arr);

    //console.log('---4108----NI_SC_MAIL_ADJUNCT==>',JSON.stringify(arr), t_gold, t_gem, t_glory);
    user.setValue("gold", t_gold);
    user.setValue("gem",t_gem);
    user.setValue("glory",t_glory);
    //对邮件道具物品的操作 end
    ////物品添加的操作 end
    selfMails[mailIndex].setValue("isAdjunct", 1);
    user.writeToDb(function(){});
    mailDao.writeByParam(user.uid, selfMails[mailIndex].data, function(err, res){
        if(err){
            resClient.err = 5;
            next(1, NID.NI_SC_MAIL_ADJUNCT, resClient);return;
        }

        resClient.result = 1;
        next(null, NID.NI_SC_MAIL_ADJUNCT, resClient);
    })
})
