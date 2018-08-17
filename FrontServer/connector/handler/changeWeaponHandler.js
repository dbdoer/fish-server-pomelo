/**
 * 换武器
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_CHANGE_WEAPON,function(packetId, param, next){

    //console.log("----------221 ----------------- " );
    var user = param.user();
    var data = param.data;
    if(data == undefined || user == undefined) {
        return ;
    }
    user.rpcTrans('changeWeapon', [data.weaponid], null);


})
