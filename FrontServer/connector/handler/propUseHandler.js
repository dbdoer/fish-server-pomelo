/**
 * 道具使用
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var prop = require("../../../Resources/prop");
var box = require("../../../Resources/box");
var bagDao = require("../../../dao/bagDao");

handlerMgr.handler(NID.NI_CS_PROP_USE,function(packetId, param, next){
    //console.log("----------111------------------------------- ");
    //console.log("----------111------------------------------- param.data",param.data);
    var user = param.user();
    if(user == undefined || user == null){
        next(1, NID.NI_SC_PROP_USE, {errCode : 1,gold:0,gem:0,bullion:0});
        return;
    }
    var data = param.data;
    if(data == undefined || data == null){
        next(1, NID.NI_SC_PROP_USE, {errCode : 2,gold:0,gem:0,bullion:0});
        return;
    }

    var bag = user.contMng.bag;
    var gold = user.getValue("gold")*1;
    var gem = user.getValue("gem")*1;
    //console.log("----------111--------------------------gold,gem",gold,gem);
    var goldNum = 0;
    var gemNum = 0;
    var bullionNum = 0;
    var propId = data.propId;
    var propNum = data.propNum*1;
    //console.log("----------111-------------------------------propId,propNum",propId,propNum);
    if(prop[propId] == undefined){
        next(1, NID.NI_SC_PROP_USE, {errCode : 3,gold:0,gem:0,bullion:0});
        return;
    }
    var _obj = bag.getRealbyGuid(propId);
    if(_obj == null ||_obj.data.propNum <= 0){
        next(1, NID.NI_SC_PROP_USE, {errCode : 4,gold:0,gem:0,bullion:0});//背包里没有该道具，无法使用
        return;
    }
    if(_obj.data.propNum*1 < propNum){
        propNum = _obj.data.propNum *1;
    }

    if(prop[propId].exchange_type ==4){
        goldNum = box[propId].gold_num*propNum;
        gemNum = box[propId].diamond_num*propNum;
        gold += goldNum* 1;
        gem += gemNum *1;
        bullionNum = box[propId].Bullion_num*propNum;

        if(bullionNum *1 > 0)
            user.fillBag([{ id: 1001, type: 4, num: bullionNum }]);
    }

    _obj.data.propNum = _obj.data.propNum*1 - propNum;
    if(propNum > 0)
        bagDao.write(user, function(){});

    if(goldNum > 0)
        user.setValue("gold",gold);

    if(gemNum > 0)
        user.setValue("gem",gem);

    if(goldNum > 0 || gemNum > 0)
        user.writeToDb(function(){});
    
    next(null, NID.NI_SC_PROP_USE, {errCode : 0,gold:goldNum,gem:gemNum,bullion:bullionNum});
})
