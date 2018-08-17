/**
 * 可兑换实物请求
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var http = require('http');
var goodsList = require("../../../ProcessDB/selectOrInsert")();

handlerMgr.handler(NID.NI_CS_GOODS_LIST,function(packetId, param, next) {
    //console.log("----------113------------------------------- ");
    var user = param.user();
    if (!user) {
        next(1, NID.NI_SC_GOODS_LIST, {errCode: 1, goodsList: []});
        return;
    }
    goodsList.processGoodsSelect(function (err,result) {
        //console.log("----------113---------------------err,result",err,result);
        if(err != null||result == undefined||result == null){
            next(1, NID.NI_SC_GOODS_LIST, {errCode: 2, goodsList: []});
            return;
        }
        var chooseTime = Date.now();
        var info = [];
        for(var key = 0; key < result.length; key++){
            /*console.log("----------113-------------------------------goods[0]",JSON.parse(goods[key].data.useTime.split("|")[0]));
             console.log("----------113-------------------------------goods[1]",JSON.parse(goods[key].data.useTime.split("|")[1]));*/
            if(new Date(result[key].start.replace(/-/g,  "/")).getTime()<=chooseTime*1&&chooseTime*1<=new Date(result[key].stop.replace(/-/g,  "/")).getTime()+1*24*60*60*1000){
                info.push({goodsName:result[key].goods_name,bullion:result[key].price,label:result[key].label,link:result[key].image,goodsId:result[key].prop_id});
            }
        }
        //console.log("----------113---------------------info",info);
        next(null, NID.NI_SC_GOODS_LIST, {errCode : 0,goodsList:info});
    });
    
    
    

    /*//var chooseTime = JSON.stringify(new Date().getFullYear())+JSON.stringify(new Date().getMonth()+1)+JSON.stringify(new Date().getDate());
    var chooseTime = Date.now();
        var goods = user.contMng.goods.m_Array;
        if(goods == undefined){
            next(1, NID.NI_SC_GET_MAIL,{mailList:[]});
            return;
        }
        var info = [];
        for(var key = 0; key < goods.length; key++){
            /!*console.log("----------113-------------------------------goods[0]",JSON.parse(goods[key].data.useTime.split("|")[0]));
            console.log("----------113-------------------------------goods[1]",JSON.parse(goods[key].data.useTime.split("|")[1]));*!/
            if(goods[key].data.useTime.split("|")[0]*1<=chooseTime*1&&chooseTime*1<=goods[key].data.useTime.split("|")[1]*1){
                info.push({goodsId:goods[key].data.goodsId,bullion:goods[key].data.bullion,label:goods[key].data.label,link:goods[key].data.link});
            }
        }
    console.log("----------113----------------------info",info);
        next(null, NID.NI_SC_GOODS_LIST, {errCode : 0,goodsList:info});*/


})
