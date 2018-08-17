/**
 * 技能
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_UseSkill,function(packetId, param, next){
    var user = param.user();
    var data = param.data;
    var resultInfo = {skillId: 0, isUsable: 0, code: 0, costType: 0};
    if(user == undefined || data == undefined){
        resultInfo.code = 1;
        next(1,  NID.NI_SC_UseSkill,resultInfo);
        return;
    }
    if(data.skillId == undefined || data.isOpen == undefined){
        resultInfo.code = 4;
        next(1,  NID.NI_SC_UseSkill,resultInfo);
        return;
    }
    /*console.log('----------------------data.skillId', data.skillId);
    var novicePackage = user.getValue("novicePackage");
    var _novicePackage = JSON.parse(novicePackage);
    console.log('----------------------_novicePackage', _novicePackage);
    if(data.skillId == 1100102){
        var isNovice = null;
        for(var key in _novicePackage){
            if(_novicePackage[key]*1 == 1){
                isNovice = 1;
            }
        }
        if(isNovice == null){
            resultInfo.code = 5;
            next(1,  NID.NI_SC_UseSkill,resultInfo);
            return;
        }
    }*/


    /*var curSkills = user.getValue("skills");
    curSkills = JSON.parse(curSkills) || {};
    if(curSkills[data.skillId] == undefined){
        resultInfo.err = 2;
        next(1,  NID.NI_SC_UseSkill,resultInfo);
        return;
    }*/
    user.rpcTrans('useSkill', [data.skillId, data.isOpen], function (err, skillId) {
        if(err != undefined){
            resultInfo.code = 3;
            next(1,  NID.NI_SC_UseSkill, resultInfo);
            return;
        }
        if (skillId == undefined || skillId == null) {
            skillId = 0;
        }
        resultInfo.skillId = data.skillId;
        resultInfo.isUsable = data.isOpen;
        resultInfo.costType = 1;
        next(null,  NID.NI_SC_UseSkill, resultInfo);
    });
})
