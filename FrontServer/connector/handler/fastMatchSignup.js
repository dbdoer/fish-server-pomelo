/**
 * 重新进入快速赛
 */
var handlerMgr = require("./../handlerMgr");
var NID = handlerMgr.NET_ID;
var logger = require("../../../common/logHelper").helper;
var bagDao = require("../../../dao/bagDao");
/**
 * code = 0:表示不在比赛ing , 1:表示在比赛ing ,其余都是错误值
 */
handlerMgr.handler(NID.NI_CS_FAST_MATCH_SIGNUP,function(packetId, param, next){
    var session = param.session;
    var user = param.user();
    var data = param.data;
    var resultInfo = { userList :[],taskFishReward:0,targetTaskFishNum:0,taskFishType :0,errCode:0};

    if(!user || data == undefined || session == undefined){
        resultInfo.errCode = 2;
        next(1, NID.NI_SC_FAST_MATCH_SIGNUP, resultInfo);
        return;
    }

    var gold = user.getValue("gold")*1;
    var vipLv = user.getValue("vipLv")*1;
    var bag = user.contMng.bag;
    var compConfigInfo = global.compConfig[data.type];
    if(compConfigInfo == undefined){
        resultInfo.errCode = 1;
        next(1, NID.NI_SC_FAST_MATCH_SIGNUP, resultInfo); //
        return;
    }
    /// 判断VIP等级
    if(data.type == 1110104||data.type == 1110204||data.type == 1110304||data.type == 1110404){
        if(vipLv < 5){
            resultInfo.errCode = 10;
            next(1, NID.NI_SC_FAST_MATCH_SIGNUP, resultInfo); //vip等级不够不让进入大亨场
            return;
        }
    }
    var curTime = new Date();
    var timeZone = data.timeZone*1;
    if(timeZone == undefined){
        resultInfo.errCode = 11;
        next(1, NID.NI_SC_FAST_MATCH_SIGNUP, resultInfo);
        return;
    }
    var timeNow = curTime.getUTCHours() + timeZone +curTime.getUTCMinutes()/60+curTime.getUTCSeconds()/(60*60);
    console.log("-------------------timeNow",timeNow);
    if(timeNow < compConfigInfo['competition_starttime'] *1 ||
        timeNow > compConfigInfo['competition_endtime'] *1){
        resultInfo.errCode = 8;
        next(1, NID.NI_SC_FAST_MATCH_SIGNUP, resultInfo);
        return;
    }
    //console.log("---------------------data.type",data.type);
    var costType = -1;
    var signUpCost = 0;
    /// 判断道具是否存在或充足
    var _obj = bag.getRealbyGuid(compConfigInfo.prop_id);
    if(_obj == null || _obj.data.propNum <= 0) {
        signUpCost = compConfigInfo.competition_cost * 1;
        console.log("-------------------signUpCost", signUpCost);
        if (gold < signUpCost) {
            resultInfo.errCode = 5;
            next(1, NID.NI_SC_FAST_MATCH_SIGNUP, resultInfo);
            return;
        }
        costType = 1;
    }
    else {
        costType = 2;
    }
    var rpcQ = session.getRpcManager().getRpcByRType('MatchQueueServer');
    if (!rpcQ) {
        logger.err('handler: NI_CS_FAST_MATCH_SIGNUP: failed to RpcByRType');
        resultInfo.errCode = 3;
        next(1, NID.NI_SC_FAST_MATCH_SIGNUP, resultInfo);
        return;
    }

    var method = rpcQ.getMethod('signUp');
    if (!method) {
        resultInfo.errCode = 4;
        next(1, NID.NI_SC_FAST_MATCH_SIGNUP, resultInfo);
        return;
    }

    var userdata = {
        gold: 0
        ,gem: 0
        ,nickname: ''
        ,headImage: ''
        ,FBheadImage:""
        ,FBnickname:""
        ,outsideUuid: ''
        ,vipLv: 0
        ,curSkinId: 0
    }

    for(var k in userdata){
        userdata[k] = user.getValue(k);
    }
    userdata.costType = costType;  ///报名费类别
    //console.log("SignUp1 = ", user.getUid());
    method(user.getUid(), global.serverId, data.type,  function (err, matchServerId, matchId, waitTime) {
        logger.debug("SignUp2 matchServerId = "+ matchServerId + ", data.type =" + data.type);
        user.setRoomServerId(matchServerId);
        user.rpcTrans('join', [matchId, userdata],  function (err, resultInfo) {
            if(err != undefined){
                resultInfo.errCode = 7;
                next(1, NID.NI_SC_FAST_MATCH_SIGNUP, resultInfo);
                return;
            }
            /// TODO 扣钱记录
            if(costType == 2){
                _obj.data.propNum = _obj.data.propNum *1 - compConfigInfo.prop_num *1;
                if(_obj.data.propNum <= 0){
                    _obj.data.propNum = 0;
                }
                bagDao.write(user, function(){});
            }
            else if(costType == 1){
                gold -= signUpCost;
                user.setValue("gold",gold);
                user.writeToDb();
            }
            logger.debug("SignUp3 Join resultInfo.errCode = "+ resultInfo.errCode + ", waitTime: " +waitTime);
            resultInfo.waitTime = waitTime || 0;
            next(null, NID.NI_SC_FAST_MATCH_SIGNUP, resultInfo);
        });
    });
})
