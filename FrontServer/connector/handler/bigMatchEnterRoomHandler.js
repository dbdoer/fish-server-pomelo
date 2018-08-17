/**
 * 
 */
var handlerMgr = require("./../handlerMgr");
var logger = require("../../../common/logHelper").helper;
var NID = handlerMgr.NET_ID;

var RET_ERR ={
    NO_USER:            1       //
    ,NO_SERVER:         2
    ,NO_RPC:            3
    ,NO_GEM:            4
    ,NO_VIPLV:          5
    ,NO_TIMEZONE:       6
    ,MATCH_CLOSE:       8       //比赛关闭
}

handlerMgr.handler(NID.NI_CS_BIG_MATCH_ENTERROOM,function(packetId, param, next){
    console.log('===272 NI_SC_BIG_MATCH_ENTERROOM==>data: ',param.data);

    var resultInfo = {err: 0, userList:[], pathinfo:[], tracktime:[], deadfishs:[],
        onlineInfo:[], curTaskFishNum:0, targetTaskFishNum:0, taskFishType:0};

    var user = param.user();
    var session = param.session;
    var data = param.data;  /// matchType, isAgainMatch

    if(!user || data == undefined || session == undefined){
        resultInfo.err = RET_ERR.NO_USER;
        next(1, NID.NI_SC_BIG_MATCH_ENTERROOM, resultInfo);
        return;
    }
    var vipLv = user.getValue("vipLv")*1;
    if(data.matchType ==1111004){
        if(vipLv<5){
            resultInfo.err = RET_ERR.NO_VIPLV;
            next(1, NID.NI_SC_BIG_MATCH_ENTERROOM, resultInfo);
            return;
        }
    }

    //根据资源表中的时间段，限制参与比赛时间段
    var row = global.compConfig[data['matchType']];
    var curTime = new Date();
    var timeZone = data.timeZone*1;
    if(timeZone == undefined){
        resultInfo.err = RET_ERR.NO_TIMEZONE;
        next(1, NID.NI_SC_BIG_MATCH_ENTERROOM, resultInfo);
        return;
    }
    var timeNow = curTime.getUTCHours() + timeZone +curTime.getUTCMinutes()/60+curTime.getUTCSeconds()/(60*60);
    console.log("-------------------timeNow",timeNow);
    if(timeNow < row['competition_starttime'] *1 || timeNow > row['competition_endtime'] *1){
        logger.err('==BigMatch Closed==>curHour: %s,start: %s,end: %s',timeNow+row['competition_starttime'] +row['competition_endtime']);
        resultInfo.err = RET_ERR.MATCH_CLOSE;
        next(1, NID.NI_SC_BIG_MATCH_ENTERROOM, resultInfo);
        return;
    }

    if(data['isAgainMatch'] == true){
        var gem  = user.getValue("gem");
        var matchTypeId = data.matchType;
        var againCostGem = global.compConfig[matchTypeId].again_cost *1;
        if(gem < againCostGem){
            resultInfo.err = 101;
            next(1, NID.NI_SC_BIG_MATCH_ENTERROOM, resultInfo);
            return;
        }
        user.setValue("gem",gem - againCostGem);
        user.writeToDb();
    }

    var rpc = session.getRpcManager().getRpcByRType('BigMatchServer');
    if (rpc == undefined || rpc == null) {
        resultInfo.err = RET_ERR.NO_SERVER;
        next(1, NID.NI_SC_BIG_MATCH_ENTERROOM, resultInfo);
        return;
    }
    var method = rpc.getMethod('joinBigMatchById');
    if (method == undefined || method == null) {
        resultInfo.err = RET_ERR.NO_RPC;
        next(1, NID.NI_SC_BIG_MATCH_ENTERROOM, resultInfo);
        return;
    }


    var userdata = {
        gold: 0
        ,gem: 0
        ,nickname: ''
        ,headImage: ''
        ,outsideUuid: ''
        ,curSkinId: 0
        ,vipLv: 0
        ,level: 0
        ,experience: 0
    }
    for(var k in userdata){
        userdata[k] = user.getValue(k);
    }

    method(global.serverId, user.uid, data, userdata, function (err, matchServerId) {
        //console.log("-------joinBigMatchById===> err, matchServerId: ",err, matchServerId);
        if(err != undefined || err != null){
            resultInfo.err = RET_ERR.NO_SERVER;
            if(err == 3){ /// 比赛还未开始
                console.log("--------------------------err",err);
                resultInfo.err = RET_ERR.MATCH_CLOSE;
                next(1, NID.NI_SC_BIG_MATCH_ENTERROOM, resultInfo);
                return;
            }
            else if(err == 101){ /// 钻石不足
                resultInfo.err = RET_ERR.NO_GEM;
                next(1, NID.NI_SC_BIG_MATCH_ENTERROOM, resultInfo);
                return;
            }
        }

        var rpcServer = session.getRpcManager().getRpcByServerId(matchServerId);
        if (!rpcServer) {
            logger.err('handler: NI_CS_BIG_MATCH_ENTERROOM: failed to get rpcServer. Id:' +matchServerId);
            resultInfo.err = RET_ERR.NO_RPC;
            next(1, NID.NI_SC_BIG_MATCH_ENTERROOM, resultInfo);
            return;
        }
        rpcServer.getMethod('msgPacketTrans')('join', user.uid, [data.matchType], function (err, result) {
            if(err != undefined || err != null || result == undefined){
                resultInfo.err = RET_ERR.NO_SERVER;
                next(1, NID.NI_SC_BIG_MATCH_ENTERROOM, resultInfo);
                return;
            }

            user.setRoomServerId(matchServerId);
            resultInfo = result;  ///重新赋值(可能会覆盖原有结构)
            resultInfo.err = 0;

            //console.log("==>>>>>>>>Send To Client Data: userList: ",resultInfo.userList);
            next(null, NID.NI_SC_BIG_MATCH_ENTERROOM, resultInfo);
        });
    });
})
