/**
 * 实物兑换
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var bagDao = require("../../../dao/bagDao");
var goodsDao = require("../../../dao/goodsDao");
//var http = require('http');
var COMM = require("../../../common/commons");
var redis2mysql = require('../../../dao/redis2mysql');
var goodsList = require("../../../ProcessDB/selectOrInsert")();
var realGift = require('../../../Resources/realgift.json');
var activityMgr = require("../../modules/activityMng");

handlerMgr.handler(NID.NI_CS_GOODS_EXCHANGE,function(packetId, param, next){
    console.log("----------114------------------------------- ");
    var user = param.user();
    if(user == undefined || user == null){
        next(1, NID.NI_SC_GOODS_EXCHANGE, {errCode : 7});
        return;
    }
    var data = param.data;
    if(data == undefined || data == null){
        next(1, NID.NI_SC_GOODS_EXCHANGE, {errCode : 8});
        return;
    }
    console.log("----------114----------------------data",data);
    var bag = user.contMng.bag;
    var goodsId = data.goodsId;

    var bullion = data.bullion;
    var gem = user.getValue("gem")*1;
    var bullionNum = -1; //物品值多少金条
    var gemNym = 0;
    var boxNym = 0;
    var now = Date.now();

    //var goods = user.contMng.goods.m_Array;
    var _obj_bullion = bag.getRealbyGuid(1001); //玩家背包里的金条
    if(bullion ==null){
        if(goodsId ==undefined){
            next(null, NID.NI_SC_GOODS_EXCHANGE, {errCode : 3});  //前端传输缺少数据
            return;
        }
        for(var key in realGift){
            if(realGift[key].product_id == goodsId){
                bullionNum = realGift[key].price*1;
                if(goodsId ==1003 ){
                    gemNym = realGift[key].count*1;
                }
                if(goodsId ==1401 ){
                    boxNym = realGift[key].count*1;
                }
                break;
            }
        }

        if(bullionNum<0){
            next(1, NID.NI_SC_GOODS_EXCHANGE, {errCode : 1});  //传过来的物品id不存在
            return;
        }

        if(_obj_bullion == null||_obj_bullion.data.propNum < bullionNum){
            next(1, NID.NI_SC_GOODS_EXCHANGE, {errCode : 2});  //金条数不够
            return;
        }

        if(global.prop[goodsId].exchange_type ==4){
            if(goodsId==1003){
                _obj_bullion.data.propNum -= bullionNum;
                gem += gemNym;
                activityMgr.costBullion(user, bullionNum);
                user.setValue("gem",gem);
                bagDao.write(user, function(){});
                user.writeToDb();
                //console.log("----------114-------------------goodsId",goodsId);
                next(null, NID.NI_SC_GOODS_EXCHANGE, {errCode : 0});
                return;
            }
            if(goodsId==1401){  //id写死是策划要求
                _obj_bullion.data.propNum -= bullionNum;
                activityMgr.costBullion(user, bullionNum);
                user.fillBag([{id:goodsId,type:4,num:boxNym}]);
                //console.log("----------114-------------------goodsId",goodsId);
                next(null, NID.NI_SC_GOODS_EXCHANGE, {errCode : 0});
                return;
            }
        }
    }else {
        var goodsName = data.goodsName;
        var userName = data.userName;
        var telephoneNumber = data.telephoneNumber;
        var email = data.email;
        if(goodsName ==undefined||userName ==undefined || telephoneNumber == undefined||email ==undefined){
            next(null, NID.NI_SC_GOODS_EXCHANGE, {errCode : 3});  //前端传输缺少数据
            return;
        }

        /*var myreg = /^0?1[3|4|5|8][0-9]\d{8}$/;
        if(!(myreg.test(telephoneNumber))) {
            next(null, NID.NI_SC_GOODS_EXCHANGE, {errCode : 4});   //电话号码有误
            return;
        }*/

        var exchange_date = COMM.timestamp();
        redis2mysql.RedisPushGoodsInfo([
            null
            ,global.serverID*1
            ,goodsName
            ,bullion*1
            ,userName
            ,telephoneNumber
            ,email
            ,3
            ,exchange_date
            ,null
        ],function (){
            //console.log("----------114-------------cb");
            goodsList.processGoodsInfo(function (is){
                console.log("---------is",is);
                if(is != true){
                    next(1, NID.NI_SC_GOODS_EXCHANGE, {errCode : 9});
                    return;
                }
                _obj_bullion.data.propNum -= bullion*1;
                activityMgr.costBullion(user, bullion*1);
                bagDao.write(user, function(){});
                next(null, NID.NI_SC_GOODS_EXCHANGE, {errCode : 0});
            });
        });




        /*goodsList.processGoodsSelect(function (err,result) {
            console.log("----------114-------------------------------result",result);
            if(err||result == undefined){
                next(1, NID.NI_SC_GOODS_EXCHANGE, {errCode : 5,bullion:0});
                return;
            }
            var state = false;
            for (var i = 0; i < result.length; i++) {
                if (goodsId == result[i].goods_id &&result[i].server_id ==2) {
                    console.log("----------114-------------result[i].start,result[i].stop",result[i].start,result[i].stop);
                    if (now > new Date(result[i].start.replace(/-/g,  "/")).getTime()&& now < new Date(result[i].stop.replace(/-/g,  "/")).getTime()+1*24*60*60*1000) {
                        state = true;
                    }
                }
            }
            if(state == false){
                console.log("----------114-------------errCode",1);
                next(1, NID.NI_SC_GOODS_EXCHANGE, {errCode : 1,bullion:0});  //传过来的物品id不存在
                return;
            }
            //console.log("----------114-------------RedisPushGoodsInfo",100,goodsId,bullionNum,userName,telephoneNumber,3,now);
            var exchange_date = COMM.timestamp();
            redis2mysql.RedisPushGoodsInfo([
                null
                ,100
                ,goodsId
                ,bullionNum
                ,userName
                ,telephoneNumber
                ,3
                ,exchange_date
                ,null
            ],function (){
                //console.log("----------114-------------cb");
                goodsList.processGoodsInfo(function (is){
                    console.log("---------is",is);
                    _obj_bullion.data.propNum -= bullionNum;
                    bagDao.write(user, function(){});
                    next(null, NID.NI_SC_GOODS_EXCHANGE, {errCode : 0,bullion:bullionNum});
                });
            });

        });*/
        /*//给php发玩家数据去存，存成功了才进行减金条操作
        var goodsName = global.prop[goodsId].prop_info;
        var content = [100,goodsName,bullionNum,userName,telephoneNumber];
        var stringArr = "http://192.168.2.97/Admin/index.php/Admin/getUserInfo?server_id=%s&goods_name=%s&price=%s&user_name=%s&phone=%s".split('%s');
        var string = '';
        for(var i =0; i< stringArr.length-1; i++){
            if(stringArr[i] != undefined) {
                string += stringArr[i] + content[i];
            }
        }
        //console.log("----------114-------------------------------string",string);
        //get 请求外网
        http.get(string,function(req,res){
            var html='';
            req.on('data',function(data){
                html+=data;
            });
            req.on('end',function(){
                //console.log("----------114-------------------------------html",html);
                if(html ==undefined){
                    next(1, NID.NI_SC_GOODS_EXCHANGE, {errCode : 7,bullion:0});//给php发消息失败
                    return;
                }
                var errCode = eval('('+html+')').errCode*1;
                if(errCode == 1){
                    next(1, NID.NI_SC_GOODS_EXCHANGE, {errCode : 5,bullion:0});//服务器不对
                    return;
                }
                if(errCode == 2){
                    next(1, NID.NI_SC_GOODS_EXCHANGE, {errCode : 1,bullion:0}); //goods_name不存在
                    return;
                }
                if(errCode == 3){
                    next(1, NID.NI_SC_GOODS_EXCHANGE, {errCode : 6,bullion:0});  //price不存在
                    return;
                }
                if(errCode == 4){
                    next(1, NID.NI_SC_GOODS_EXCHANGE, {errCode : 3,bullion:0});//user_name不存在
                    return;
                }
                if(errCode == 5){
                    next(1, NID.NI_SC_GOODS_EXCHANGE, {errCode : 4,bullion:0});//phone不存在
                    return;
                }
                if(errCode == 0){
                    _obj_bullion.data.propNum -= bullionNum;
                    bagDao.write(user, function(){});
                    next(null, NID.NI_SC_GOODS_EXCHANGE, {errCode : 0,bullion:bullionNum});
                }
            });
        });*/
    }


})
