/**
 * 月卡使用
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var giftPackage = require("../../../Resources/giftPackage");

handlerMgr.handler(NID.NI_CS_MONTHCARD_USE,function(packetId, param, next){
    console.log("----------115-------------param.data: ", param.data);

    var user = param.user();

    if(user == undefined || user == null){
        next(1, NID.NI_SC_PURCH_PRODUCT, {errCode:1});
        return;
    }
    var gem = user.getValue("gem")*1;
    var gold = user.getValue("gold")*1;
    var glory = user.getValue("glory") *1;
    var rechargecoefficient = user.getValue("rechargeCoefficient")*1;
    var costquota = user.getValue("costQuota")*1;

    var productNum = 0;
    var gemCostNum = 0;
    var addProp = function (key) {
        var arr = [];
        var arrGiftId = giftPackage[key].prop_id.split('|');
        var arrGiftNum = giftPackage[key].count.split('|');
        console.log("----------------arrGiftId",arrGiftId);
        console.log("----------------arrGiftNum",arrGiftNum);
        for(var i=0;i< arrGiftId.length;i++){
            var g_prop = global.prop[arrGiftId[i]];
            if(g_prop == undefined){ continue; }

            if(arrGiftId[i] *1 == 1002){
                gold += arrGiftNum[i]*1 || 0;
                productNum = arrGiftNum[i]*1;
            }
            else if(arrGiftId[i] *1 == 1003){
                gem += arrGiftNum[i]*1 || 0;
                gemCostNum = arrGiftNum[i]*1;
            }
            else if(arrGiftId[i] *1 == 1004){
                glory += arrGiftNum[i]*1 || 0;
            }
            else {
                arr.push({id: arrGiftId[i]*1, type: g_prop.exchange_type*1, num: arrGiftNum[i]*1});
            }
        }
        user.fillBag(arr);
    }
    addProp("104501");
    //var monthCard = user.getValue("monthCard")*1;
    var canGet = user.getValue("canGet")*1;
    //var monthCardDate = user.getValue("monthCardDate")*1;//购买之后立即使用，后端还是剩余30天，因为是以绝对时间作为参考，但是当天已经不能领取了，前端在这个时间基础上减一天（此注释不要删除！！！）

    if(user.roomServerId != undefined && user.roomServerId != null){
        user.rpcTrans('purchase', [productNum,gemCostNum,rechargecoefficient,costquota], function (err, ret) {
        });
    }

     user.setValue("canGet",0);

    user.setValue("gem",gem);
    user.setValue("gold",gold);
    user.setValue("glory",glory);
    user.writeToDb(function(){});
    
    next(null, NID.NI_SC_MONTHCARD_USE, {errCode:0});

})
