/**
 * 商城购买
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var COMM = require("../../../common/commons");
var mall_gold = require('../../../Resources/English/gold');
var mall_diamond = require('../../../Resources/English/diamond');
var giftPackage = require("../../../Resources/English/giftPackage");
var guizu = require("../../../Resources/guizu");
var shouchong = require("../../../Resources/English/shouchong");
var otherGift = require("../../../Resources/English/otherGift");
var quota = require('../../../Resources/English/quota');
var activityMgr = require("../../modules/activityMng");
var redis2mysql = require('../../../dao/redis2mysql');
var rechargeList = require("../../../ProcessDB/selectOrInsert")();

handlerMgr.handler(NID.NI_CS_PURCH_PRODUCT,function(packetId, param, next){
    console.log("----------901-------------param.data: ", param.data);
    var result = {productID: null, productType: null, productNum: null, err: 0};
    var user = param.user();
    //var bag = user.contMng.bag;
    if(user == undefined || user == null){
        result.err = 1;
        next(1, NID.NI_SC_PURCH_PRODUCT, result);
        return;
    }
    var data = param.data;
    if(data == undefined || data == null){
        result.err = 2;
        next(1, NID.NI_SC_PURCH_PRODUCT, result);
        return;
    }
    /*if(data.state != 1 && data.tradeNo){
        result.err = 5;
        next(1, NID.NI_SC_PURCH_PRODUCT, result);
        return;
    }*/
    /*rechargeList.processTradeSelect(function (err,rechargeInfoList){
        //console.log('----------------------rechargeInfoList', rechargeInfoList);
        var exit = null;
        for(var i =0 ;i < rechargeInfoList.length ; i++){
            if(data.tradeNo == rechargeInfoList[i].trade_no){
                exit = 1;
                break;
            }
        }
        console.log('----------------------exit', exit);*/
        /*if(exit == null){
            result.err = 5;
            next(1, NID.NI_SC_PURCH_PRODUCT, result);
            return;
        }*/
        var viplevel = user.getValue("vipLv")*1;
        var vipnumber = user.getValue("vipNumber")*1;
        var rechargecoefficient = user.getValue("rechargeCoefficient")*1;
        var costquota = user.getValue("costQuota")*1;
        var rmbNum = 0;
        var gem = user.getValue("gem")*1;
        var gold = user.getValue("gold")*1;
        var glory = user.getValue("glory") *1;
        var getPackage = user.getValue("getPackage")*1;
        var getOtherPackage1 = user.getValue("getOtherPackage1")*1;
        var getOtherPackage2 = user.getValue("getOtherPackage2")*1;
        var getOtherPackage3 = user.getValue("getOtherPackage3")*1;
        var getOtherPackage4 = user.getValue("getOtherPackage4")*1;
        var novicePackage = user.getValue("novicePackage");
        var _novicePackage = JSON.parse(novicePackage);

        var novicePackageTime = user.getValue("novicePackageTime")*1;
        var monthCard = user.getValue("monthCard")*1;
        var canGet = user.getValue("canGet")*1;
        var monthCardDate = user.getValue("monthCardDate")*1;
        var cardBoxPropRate = user.getValue("cardBoxPropRate")*1;
        var goldByPurchase = user.getValue("goldByPurchase")*1;
        var gemByPurchase = user.getValue("gemByPurchase")*1;
        var pid = data.productID;
        console.log('----------------------pid', pid);
        var trade_no = data.tradeNo;
        //console.log('----------------------trade_no', trade_no);
        var productType = null;
        var productNum = 0;
        var gemCostNum = 0;
        for (var key in mall_gold) {
            if (mall_gold[key].product_id == pid) {
                productType = 1; //金币
                gem -= mall_gold[key].price*1;
                gold += mall_gold[key].count*1;
                productNum = mall_gold[key].count*1;
                gemCostNum = mall_gold[key].price*-1;
                goldByPurchase += mall_gold[key].count*1;
            }
        }
        for (var key in mall_diamond) {
            if (mall_diamond[key].product_id == pid) {
                productType = 2; //钻石
                gem += mall_diamond[key].count*1;
                vipnumber += mall_diamond[key].price*1;
                rmbNum += mall_diamond[key].price*1;
                //productNum = mall_diamond[key].count*1;
                productNum = 0;
                gemCostNum = mall_diamond[key].count*1;
                gemByPurchase += mall_diamond[key].count*1;
            }
        }
        var addProp = function (key) {
            var arr = [];
            var arrGiftId = otherGift[key].prop_id.split('|');
            var arrGiftNum = otherGift[key].count.split('|');
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
            productType = 3;
            vipnumber += otherGift[key].price*1;
            rmbNum += otherGift[key].price*1;
        }
        var addPropOfShouchong = function (key) {
            var arr = [];
            var arrGiftId = shouchong[key].prop_id.split('|');
            var arrGiftNum = shouchong[key].count.split('|');
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
            productType = 3;
            vipnumber += shouchong[key].price*1;
            rmbNum += shouchong[key].price*1;
        }
        for (var key in shouchong) {
            if (shouchong[key].product_id == pid&&shouchong[key].product_id =="com.cqgaming.fish.icepack660") {
                console.log('----------------------_novicePackage.getShouchongPackage1',_novicePackage.getShouchongPackage1);
                if(_novicePackage.getShouchongPackage1 == undefined||_novicePackage.getShouchongPackage1 == 1 ||_novicePackage.getShouchongPackage4 == 1){
                    result.err = 6;
                    next(1, NID.NI_SC_PURCH_PRODUCT, result);
                    return;
                }
                addPropOfShouchong(key);
                _novicePackage.getShouchongPackage1 = 1;
                if(novicePackageTime == 0){
                    user.setValue("novicePackageTime",Date.now());
                }
            }
            if (shouchong[key].product_id == pid&&shouchong[key].product_id =="com.cqgaming.fish.icepack2160") {
                if(_novicePackage.getShouchongPackage2 == undefined||_novicePackage.getShouchongPackage2 == 1 ||_novicePackage.getShouchongPackage4 == 1){
                    result.err = 6;
                    next(1, NID.NI_SC_PURCH_PRODUCT, result);
                    return;
                }
                addPropOfShouchong(key);
                _novicePackage.getShouchongPackage2 = 1;
                if(novicePackageTime == 0){
                    user.setValue("novicePackageTime",Date.now());
                }
            }
            if (shouchong[key].product_id == pid&&shouchong[key].product_id =="com.cqgaming.fish.icepack3900") {
                if(_novicePackage.getShouchongPackage3 == undefined||_novicePackage.getShouchongPackage3 == 1 ||_novicePackage.getShouchongPackage4 == 1){
                    result.err = 6;
                    next(1, NID.NI_SC_PURCH_PRODUCT, result);
                    return;
                }
                addPropOfShouchong(key);
                _novicePackage.getShouchongPackage3 = 1;
                if(novicePackageTime == 0){
                    user.setValue("novicePackageTime",Date.now());
                }
            }
            if (shouchong[key].product_id == pid&&shouchong[key].product_id =="com.cqgaming.fish.icepack7500") {
                if(_novicePackage.getShouchongPackage1 == 1 ||_novicePackage.getShouchongPackage2 == 1 ||_novicePackage.getShouchongPackage3 == 1||
                    _novicePackage.getShouchongPackage4 == undefined||_novicePackage.getShouchongPackage4 == 1){
                    result.err = 6;
                    next(1, NID.NI_SC_PURCH_PRODUCT, result);
                    return;
                }
                addPropOfShouchong(key);
                _novicePackage.getShouchongPackage4 = 1;
            }
        }
        console.log('----------------------_novicePackage',_novicePackage);
        for (var key in giftPackage) {
            /*if (giftPackage[key].product_id == pid&&giftPackage[key].product_id =="com.punchbox.buyushijie.iap.gift.tierA") {
                console.log('----------------------shouchong');
                if(getPackage == 1){
                    break;
                }
                productType = 3;
                gold += shouchong[1002].count*1;
                gem += shouchong[1003].count*1;
                user.fillBag([{ id: 1001, type: 4, num: shouchong[1001].count*1}]);
                vipnumber += giftPackage[key].price*1;
                rmbNum += giftPackage[key].price*1;
                productNum = shouchong[1002].count*1;  //购买后获得的物品数量，无意义
                gemCostNum = shouchong[1003].count*1;
                user.setValue("getPackage",1);
            }*/
            if (giftPackage[key].product_id == pid && giftPackage[key].product_id =="com.cqgaming.fish.moonthpack") {
                //console.log('----------------------guizu', giftPackage[key].product_id);        
                //第一次购买月卡
                if(monthCard == 0){
                    user.setValue("monthCardDate", Date.now()+30*24*60*60*1000);
                    user.setValue("monthCard",30);
                    productType = 3;
                    cardBoxPropRate = global.other[1].box_rate *1;
                    vipnumber += giftPackage[key].price*1;
                    rmbNum += giftPackage[key].price*1;
                    //productNum = 0;    //购买后获得的物品数量，无意义
                    user.setValue("canGet",1);
                }else {
                    user.setValue("monthCardDate", monthCardDate+30*24*60*60*1000);
                    user.setValue("monthCard",monthCard+30);
                    productType = 3;
                    vipnumber += giftPackage[key].price*1;
                    rmbNum += giftPackage[key].price*1;
                }

            }
        }
        for (var key in otherGift) {
            if (otherGift[key].product_id == pid&&otherGift[key].product_id =="com.cqgaming.fish.pack7820") {
                if(getOtherPackage1 == 1){
                    result.err = 7;
                    next(1, NID.NI_SC_PURCH_PRODUCT, result);
                    return;
                }
                addProp(key);
                user.setValue("getOtherPackage1",1);
                user.setValue("timePackage1",Date.now());
            }
            if (otherGift[key].product_id == pid&&otherGift[key].product_id =="com.cqgaming.fish.pack15360") {
                if(getOtherPackage2 == 1){
                    result.err = 7;
                    next(1, NID.NI_SC_PURCH_PRODUCT, result);
                    return;
                }
                addProp(key);
                user.setValue("getOtherPackage2",1);
                user.setValue("timePackage2",Date.now());
            }
            if (otherGift[key].product_id == pid&&otherGift[key].product_id =="com.cqgaming.fish.pack42640") {
                if(getOtherPackage3 == 1){
                    result.err = 7;
                    next(1, NID.NI_SC_PURCH_PRODUCT, result);
                    return;
                }
                addProp(key);
                user.setValue("getOtherPackage3",1);
                user.setValue("timePackage3",Date.now());
            }
            if (otherGift[key].product_id == pid&&otherGift[key].product_id =="com.cqgaming.fish.pack97200") {
                if(getOtherPackage4 == 1){
                    result.err = 7;
                    next(1, NID.NI_SC_PURCH_PRODUCT, result);
                    return;
                }
                addProp(key);
                user.setValue("getOtherPackage4",1);
                user.setValue("timePackage4",Date.now());
                if(otherGift[key].skin_id*1 != 0){
                    var retNum = user.addUnlockSkin(otherGift[key].skin_id);
                    if(retNum < 0){
                        console.log('====> this skin id %d is err <=====', otherGift[key].skin_id);
                    }
                }
            }
        }
        
        if (productType == null) {
            result.err = 3;
            next(1, NID.NI_SC_PURCH_PRODUCT, result);
            return;

        }


        ////充值记录写入
        /*if(rmbNum > 0){
            var recharge_date = COMM.timestamp();
            redis2mysql.RedisPushRechargeUpdate([
                user.getValue('outsideUuid')
                ,rmbNum
                ,recharge_date
                ,data.state
                ,trade_no
            ],function (){
                rechargeList.processRechargeUpdate(function (is){
                });
            });
        }*/


        var newSkillId = 0;  ///解锁的技能ID
        for(var i = Object.keys(global.vip_En).length; i > 0; i--){
            if(global.vip_En[i] != undefined && vipnumber >= global.vip_En[i].Price){
                viplevel = i;
                newSkillId = global.vip_En[i].skill_id;
                break;
            }
        }
        /// 是否达到解锁皮肤的等级
        var arrSkinID = global.getSkinIdByAct(viplevel);
        if(arrSkinID != undefined && arrSkinID.length > 0){
            /// VIP等级有几率存在一次连升几级
            var tempSkins = user.getValue('unlockSkins');
            tempSkins = JSON.parse(tempSkins);
            for(var a =0; a <arrSkinID.length; a++){
                if(tempSkins[arrSkinID[a]] != undefined){
                    continue; /// 已经存在的无需再添加
                }
                var retNum = user.addUnlockSkin(arrSkinID[a]);
                if(retNum < 0){
                    console.log('====> this skin id %d is err <=====', arrSkinID[a]);
                }
            }
        }

        /// 是否达到解锁狂暴技能的等级
        var retNum = user.setKuangBaoSkill(newSkillId);
        if(retNum < 0){
            console.log('==Err==> this new skill id = <=====', newSkillId);
        }
        //console.log('==++++2222+++++==> curSkills ==== ', user.getValue('skills'), vipnumber, viplevel);

        //充值系数
        var info = [];
        for(var key in quota){
            info.push(key);
        }

        for(var i = info.length-1; i >= 0; i--){
            if(vipnumber >= info[i]*1){
                rechargecoefficient = quota[info[i]].recharge_coefficient;
                costquota = quota[info[i]].cost_quota;
                break;
            }

        }

        if(user.roomServerId != undefined && user.roomServerId != null){
            user.rpcTrans('purchase', [productNum,gemCostNum,rechargecoefficient,costquota], function (err, ret) {
            });
        }

        user.setValue("goldByPurchase",goldByPurchase);
        user.setValue("gemByPurchase",gemByPurchase);
        user.setValue("vipNumber",vipnumber);
        user.setValue("vipLv",viplevel);
        user.setValue("rechargeCoefficient",rechargecoefficient);
        user.setValue("costQuota",costquota);
        user.setValue("cardBoxPropRate",cardBoxPropRate);
        user.setValue("gem",gem);
        user.setValue("gold",gold);
        user.setValue("glory",glory);
        user.setValue("novicePackage",JSON.stringify(_novicePackage));

        result.productID = pid;
        result.productType = productType;
        result.productNum = productNum;
        //console.log("----------901-------------------------------result ",result);
        //活动
        if(rmbNum > 0){
            activityMgr.recharge(user, rmbNum);
        }
        if(gemCostNum < 0){
            activityMgr.costGem(user, gemCostNum*-1);
        }
        ////
        user.writeToDb(function(){});
        //console.log("----------901-------------------------------result ",result);
        next(null, NID.NI_SC_PURCH_PRODUCT, result);
    //});


})
