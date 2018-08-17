/**
 * 修改用户昵称
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var COMM = require("../../../common/commons");
var activityMgr = require("../../modules/activityMng");

handlerMgr.handler(NID.NI_CS_CHANGE_NAME,function(packetId, param, next){
    var user = param.user();
    var data = param.data;
    if(!data || user == undefined || data == undefined||data.newNickname == undefined) {
        next(1, NID.NI_SC_CHANGE_NAME, {code: 1, newNickname: "NickNameFailed"});
        return ;
    }
    var gem = user.getValue("gem")*1;
    var name = user.getValue("nickname");
    var isUpdate = user.getValue("isUpdate")*1;
    //console.log('------------------name,data.newNickname',name,data.newNickname);
    if(name === data.newNickname){
        next(1, NID.NI_SC_CHANGE_NAME, {code: 2, newNickname: "NickNameFailed"});//改相同名字
        return;
    }
    if(isUpdate != 0){
        if(gem < global.other[1].rename_cost*1){
            next(1, NID.NI_SC_CHANGE_NAME, {code: 3, newNickname: "NickNameFailed"});//钻石不足
            return;
        }
    }

    var GetLength = function(str) {
        var realLength = 0, len = str.length, charCode = -1;
        for (var i = 0; i < len; i++) {
            charCode = str.charCodeAt(i);
            if (charCode >= 0 && charCode < 128) realLength += 1;
            else realLength += 2;
        }
        return realLength;
    };

    console.log('mods["102"]=>jmz.GetLength(data.newNickname)==>>: ',GetLength(data.newNickname));
    var stringname = data.newNickname;
    var nameLength = GetLength(data.newNickname)*1;
    if(nameLength <= 0){
        next(1, NID.NI_SC_CHANGE_NAME, {code: 4, newNickname: "NickNameFailed"});//长度为0
        return;
    }
    if( nameLength > 12) {
        var Length1 = 0, len = data.newNickname.length, charCode = -1;
        var m = -1;
        for (var i = 0; i < len; i++) {
            charCode = data.newNickname.charCodeAt(i);
            if (charCode >= 0 && charCode < 128) {
                Length1 += 1;
                if (Length1 > 12) {
                    m = i;
                    break;
                }
                continue;
            }

            Length1 += 2;
            if (Length1 > 12) {
                m = i;
                break;
            }
        }
        if(m >= 0) {
            stringname = data.newNickname.substring(0, m);
        }
    }
    if(isUpdate == 0){
        user.setValue("isUpdate",1);
        user.setValue("nickname",stringname);
        user.writeToDb();
    }else{
        gem -= global.other[1].rename_cost*1;
        activityMgr.costGem(user, global.other[1].rename_cost*1);
        user.setValue("nickname",stringname);
        user.setValue("gem",gem);
        user.writeToDb();
    }

    next(null,NID.NI_SC_CHANGE_NAME, {code: 0, newNickname: stringname});

    /*if(GetLength(data.newNickname)*1<=12){
        next(null,NID.NI_SC_CHANGE_NAME, {code: 0, newNickname: data.newNickname});
        user.setValue("nickname",data.newNickname);
        user.writeToDb();

    }
    else if(GetLength(data.newNickname)*1>12){
        var Length1 = 0, len = data.newNickname.length, charCode = -1;
        for (var i = 0; i < len; i++) {
            charCode = data.newNickname.charCodeAt(i);
            if (charCode >= 0 && charCode < 128) Length1 += 1;
            else Length1 += 2;
            if(Length1>12){
                var m = i;
                break;
            }
        }
        var stringname = data.newNickname.substring(0,m);
        console.log('mods["102"]=>stringname==>>: ',stringname);

        next(null,NID.NI_SC_CHANGE_NAME, {code: 0, newNickname: stringname});
        user.setValue("nickname",data.newNickname);
        user.writeToDb();
    }*/

})