/**
 * 兑换码使用
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var codeList = require("../../../ProcessDB/selectOrInsert")();
var redeemCode = require("../../../dao/redeemCodeDao");
var redis2mysql = require('../../../dao/redis2mysql');
var ObjCode = require('../../../obj/objCode');

handlerMgr.handler(NID.NI_CS_REDEEM_CODE_USE,function(packetId, param, next){
    console.log("------------------------117");
    var user = param.user();
    var data = param.data;
    if(user == undefined || user == null || data == undefined){
        console.log("===117 NI_CS_FIRE ===>user || data == undefined");
        next(1,  NID.NI_SC_REDEEM_CODE_USE, {errCode:1,dataPropList :[]});
        return;
    }
    if(data.id == undefined){
        console.log("===117 NI_CS_FIRE ===>user || data == undefined");
        next(1,  NID.NI_SC_REDEEM_CODE_USE, {errCode:2,dataPropList :[]});
        return;
    }

    var id = data.id;
    console.log("===117 NI_CS_FIRE ===>id",id);
    var now = Date.now();
    redeemCode.load(user, function (err, res) {
        var codes = user.contMng.codes.m_Array;
        console.log("----------117-------------------------------codes", codes);
        var bagFunction = function (info) {
            var codeBag = user.contMng.codes;
            var gold = user.getValue("gold")*1;
            var gem = user.getValue("gem")*1;
            var item = new ObjCode();
            item.setValue("numID", info.number);
            item.setValue("id",info.code);
            codeBag.add(item);
            redeemCode.write(user,function () {});
            var toolInfo = JSON.parse(info.tool_info);
            //console.log("----------117-------------------------------toolInfo", toolInfo);

            var propInfo = [];
            var toolInfo2 = [];
            for(var m=0;m<toolInfo.length;m++){
                if(toolInfo[m].goodId == "1002"){
                    gold += toolInfo[m].goodNum*1;
                    user.setValue("gold",gold);
                }
                else if(toolInfo[m].goodId == "1003"){
                    gem += toolInfo[m].goodNum*1;
                    user.setValue("gem",gem);
                }
                else{
                    propInfo.push({id:toolInfo[m].goodId*1,type:4,num:toolInfo[m].goodNum*1});
                }
                toolInfo2.push({propID:toolInfo[m].goodId*1,propType:4,propNum:toolInfo[m].goodNum*1});
            }
            console.log("----------117-------------------------------toolInfo2", toolInfo2);
            user.fillBag(propInfo);
            user.writeToDb(function(){});
            redis2mysql.RedisUpdateRedeemCode([
                info.used_num
                ,info.code
            ]);
            next(null, NID.NI_SC_REDEEM_CODE_USE, {errCode: 0,dataPropList :toolInfo2});
        }
        if (codes.length == 0) {
            //console.log("----------117-------------------------------1");
            var code_Exist_ = false;
            codeList.processRedeemCodeSelect(function (err,result) {
                if(err||result == undefined){
                    next(1, NID.NI_SC_REDEEM_CODE_USE, {errCode: 3,dataPropList :[]});
                    return;
                }
                for (var i = 0; i < result.length; i++) {
                    if (id == result[i].code) {
                        code_Exist_ = true;
                        if (now < new Date(result[i].start_time.replace(/-/g,  "/")).getTime()||now > new Date(result[i].stop_time.replace(/-/g,  "/")).getTime()+1*24*60*60*1000) {
                            next(1, NID.NI_SC_REDEEM_CODE_USE, {errCode: 4,dataPropList :[]});  //兑换码不在可使用时间内
                            return;
                        }
                        if (result[i].used_num == 0) {
                            next(1, NID.NI_SC_REDEEM_CODE_USE, {errCode: 5,dataPropList :[]});  //兑换码使用次数已用完
                            return;
                        } else {
                            result[i].used_num -= 1;
                            bagFunction(result[i]);
                        }

                    }
                }
                if(code_Exist_ == false){
                    next(1, NID.NI_SC_REDEEM_CODE_USE, {errCode: 6,dataPropList :[]});  //兑换码在mysql库中没有
                    return;
                }
            });
        }else {
            //console.log("----------117-------------------------------2");
            var codeExist = null;
            for (var k = 0; k < codes.length; k++) {
                if (codes[k].data.id == id) {
                    codeExist = codes[k].data;break;   //在本地找到该兑换码（注意：比较的是id不是编号，说明该兑换码曾经使用过）
                }
            }
            var code_Exist = false;
            codeList.processRedeemCodeSelect(function (err,result) {
                if(err||result == undefined){
                    next(1, NID.NI_SC_REDEEM_CODE_USE, {errCode: 3,dataPropList :[]});
                }
                //console.log("----------117-------------------------------result", result);
                for (var i = 0; i < result.length; i++) {
                    if (id == result[i].code) {
                        code_Exist = true;     //该兑换码在mysql中存在
                        if(codeExist !=null){
                            if (id == result[i].code) {
                                if (now < new Date(result[i].start_time.replace(/-/g,  "/")).getTime()||now > new Date(result[i].stop_time.replace(/-/g,  "/")).getTime()+1*24*60*60*1000) {
                                    next(1, NID.NI_SC_REDEEM_CODE_USE, {errCode: 4,dataPropList :[]});  //兑换码不在可使用时间内
                                    return;
                                }
                                if (result[i].used_num == 0) {
                                    console.log("----------117-------------------------------yongwan");
                                    next(1, NID.NI_SC_REDEEM_CODE_USE, {errCode: 5,dataPropList :[]});  //兑换码使用次数已用完
                                    return;
                                } else {
                                    result[i].used_num -= 1;
                                    bagFunction(result[i]);
                                }

                            }
                        }else {
                            for (var k = 0; k < codes.length; k++) {
                                if (result[i].number == codes[k].data.numID) {
                                    console.log("----------117-------------------------------huchi");
                                    next(1, NID.NI_SC_REDEEM_CODE_USE, {errCode: 7,dataPropList :[]});  //相同类型其他兑换码已经使用过
                                    return;
                                }
                            }

                            if (now < new Date(result[i].start_time.replace(/-/g,  "/")).getTime()||now > new Date(result[i].stop_time.replace(/-/g,  "/")).getTime()+1*24*60*60*1000) {
                                next(1, NID.NI_SC_REDEEM_CODE_USE, {errCode: 4,dataPropList :[]});  //兑换码不在可使用时间内
                                return;
                            }
                            if (result[i].used_num == 0) {
                                next(1, NID.NI_SC_REDEEM_CODE_USE, {errCode: 5,dataPropList :[]});  //兑换码使用次数已用完
                                return;
                            } else {
                                result[i].used_num -= 1;
                                bagFunction(result[i]);
                            }
                        }

                    }
                }
                if(code_Exist == false){
                    next(1, NID.NI_SC_REDEEM_CODE_USE, {errCode: 6,dataPropList :[]});  //兑换码在sql库中不存在
                    return;
                }
            });

        }
    });

})
