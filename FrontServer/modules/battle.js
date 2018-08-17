/**
 * Created by 李峥 on 2016/3/27.
 * 捞鱼中的消息
 */

var logger = require("../../common/logHelper").helper;

function nop() {
}

var SESSION_FIELD_LEAVE_ROOM = 'leaveRoom';
var SESSION_FIELD_ROOM_SERVER_ID = 'roomServerId';
var SESSION_FIELD_FAST_MATCH_INFO = 'fastMatch';

var redis;
var session;
var rpcManager;
var roomManager = global.roomManager;

var mods = {};
var __total = 0;

var log = function(info) {
    //console.log(info + "          -- "+ __total++);
}

//进入房间
mods["201"] = function (sid, uid, data, cb) {
    console.log("==mods[201]==>uid ,data= ", uid, data);
    //console.log('step1 send room info to client\n' + JSON.stringify(data));
    roomManager.allocateRoom(parseInt(data.roomId), uid, function (err, data) {
        storeRoomServer(sid, uid, data.roomServerId, {type: 10});
        //console.log('step2 send room info to client\n' + JSON.stringify(data));
        cb(null, 4201, "SC_OnlineRoomInfo", data);
    });
};
//离开房间
mods["205"] = function (sid, uid, data, cb) {
    console.log("===mods[205]==>leaveRoom uid = , data = ", uid, data);
    var roomServerId = session.get(sid, SESSION_FIELD_ROOM_SERVER_ID);
    if (!roomServerId) {
       cb(null, 4205, "SC_LeaveRoom", {code: 101010});//TODO 一个错误信息 并没有在房间中
        return;
    }

    if(data.type == undefined || data.type == undefined){
        cb(null, 4205, "SC_LeaveRoom", {code: 123123});//
        return;
    }

    //唐健 添加
    var tempCode = 0;
    if(data.type *1 == 11){
        tempCode = 1;
    }else if(data.type *1 == 12){
        tempCode = 2;
    }

    //room server error
    var trans = getRoomServerTrans(sid);
    if (!trans) {
        cb(null, 4205, "SC_LeaveRoom", {code: 121212});//TODO 一个错误信息 并没有在房间中
        return ;
    }


    //console.log('=mods["205"] ==>leaveRoom! uid =%s', uid);
    trans('leaveRoom', uid, [], function (err) {
        if(err !== undefined){
            cb(null, 4205, "SC_LeaveRoom", {code: err});
            return ;
        }

        cb(null, 4205, "SC_LeaveRoom", {code: tempCode});
    });

};
//打炮
mods["207"] = function (sid, uid, data, cb) {
    log("207 --- uid = "+ uid);
    var trans = getRoomServerTrans(sid);
    if (trans) {
        trans('fire', uid, [data.fireX, data.fireY], function (err, fireCount) {
            //console.log('=mods["207"]=++22222++=>fireCount: ',fireCount);
            if (fireCount == undefined || fireCount == null) {
                fireCount = 0;
            }
            if (!!err) {
                console.log('=mods["207"]=++333++=>err: ', err);
                cb(null, 4207, "SC_Fire", [data.clientid, fireCount, false]);
            }
            cb(null, 4207, "SC_Fire", [data.clientid, fireCount, true]);
        });
    }
};
//子弹爆炸 房间内消息 向后端转发
mods["209"] = function (sid, uid, data, cb) {
    log("209 --- uid = "+ uid);
    var trans = getRoomServerTrans(sid);
    if (trans) {
        trans('explosion', uid, [data], function () {
            //if (deadFish && deadFish.length > 0)
            //    cb(null, 4209, null, deadFish);
        });
    }
};

//向后端转发的消息 使用卡牌
mods["216"] = function (sid, uid, data, cb) {
    log("216 --- uid = "+ uid);
};
//向后端转发的消息 Rainbow卡释放位置
mods["218"] = function (sid, uid, data, cb) {
    log("218 --- uid = "+ uid);
};

//向后端转发的消息 事件造成的爆炸
mods["219"] = function (sid, uid, data, cb) {
    log("219 --- uid = "+ uid);
};
//向后端转发的消息 切换武器
mods["221"] = function (sid, uid, data, cb) {
    log("221 --- uid = "+ uid);
    var trans = getRoomServerTrans(sid);
    if (!trans) {
        return;//rpc error
    }
    trans('changeWeapon', uid, [data.weaponid], null);
};

//获取服务器房间数据
mods["261"] = function (sid, uid, data, cb) {
    var obj = roomManager.getNormalRoomInfo();
    var list = [];
    for (var k in obj) {
        list.push({type: k, count: obj[k]});
    }
    console.log("+++mods[261] ===>list = ",JSON.stringify(list));
    cb(null, 4261, "SC_NormalRoomList", {room: list});
};
//更换座位
mods["262"] = function (sid, uid, data, cb) {
    log("262 --- uid = "+ uid);
    var trans = getRoomServerTrans(sid);

    if (trans) {
        trans('changeSite', uid, [data.toSite], function (err, newSite) {
            cb(null, 4262, "SC_ChangeSite", {err: err, newSite: newSite});
        });
    }
};

//获取快速比赛列表
mods["264"] = function (sid, uid, data, cb) {
    log("264 --- uid = "+ uid);
    var rpc = rpcManager.getRpcByRType('MatchQueueServer');
    var method = rpc.getMethod('getFastMatchInfo');
    console.log('=mods["264"]==>method: ',method)
    if (method)
        method(function (err, list) {
            list = [{ "count": 2, "cost": 30000, "total ": 999},
                { "count": 4, "cost": 30000, "total ": 999},
                { "count": 8, "cost": 30000, "total ": 999},
                { "count": 40, "cost": 30000, "total ": 999}
            ];
            console.log('=mods["264"]=++++++++=>' + uid);
            cb(null, 4264, "SC_FastMatchList", {list: list});
        });
};
//快速比赛报名 sign up
mods["265"] = function (sid, uid, data, cb) {
    log("265 --- uid = "+ uid);
    //TODO 验证钱够不够
    var rpcQ = rpcManager.getRpcByRType('MatchQueueServer');
    if (rpcQ) {
        var method = rpcQ.getMethod('signUp');
        //console.log('=1111==mods["265"]==>signUp: ',uid, global.serverId, data.type);
        method(uid, global.serverId, data.type, function (err, matchServerId, matchId) {
            //TODO 扣钱记录
            // 转发至MatchServer

            var rpcMatch = rpcManager.getRpcByServerId(matchServerId);
            if (!rpcMatch) {
                logger.err('mods[265]: failed to get rpcServer. Id:' +matchServerId);
                // TODO: 如何做异常处理 by wdl(2017.06.16)
            }
            storeRoomServer(sid, uid, matchServerId, {type: 11});
            //console.log('=2222==mods["265"]==>matchServerId: ',matchServerId,matchId);
            rpcMatch.getMethod('msgPacketTrans')('join', uid, [matchId], function (err, resultInfo) {
                //console.log('=3333==mods["265"]==>matchId,roomInfo: ',matchId,resultInfo);
                cb(null, 4265, "SC_FastMatchSignUp", resultInfo);
            });
        });
    }
};

//获取大奖赛数据
mods["271"] = function (sid, uid, data, cb){
    console.log("==mods[271]==>uid ,data= ", uid, data);

    var rpcQ = rpcManager.getRpcByRType('BigMatchServer');
    if (rpcQ) {
        var method = rpcQ.getMethod('getBigMatchInfo');
        method(function (err, list) {
            if(err != undefined || err != null){
                cb(null, 4271, "SC_Big_Match_Info", {err: 2, infoList: []});
            }

            var curTime = Math.floor(Date.now() /1000);
            console.log("==mods[271]==>list= ", JSON.stringify({err: 0, infoList: list, time: curTime +''}));
            cb(null, 4271, "SC_Big_Match_Info", {err: 0, infoList: list, time: curTime +''});
        });
    }else{
        cb(null, 4271, "SC_Big_Match_Info", {err: 1, infoList: []});
    }
};
//大奖赛进入房间
mods["272"] = function (sid, uid, data, cb){
    var resultInfo = {err: 0, userList:[], pathinfo:[], tracktime:[], deadfishs:[],
        onlineInfo:[], curTaskFishInfo:[], targetTaskFishNum:0, taskFishType:0};

    console.log("==mods[272]==>data = ", data);
    if(data == null || data.matchType == undefined || data.isAgainMatch == undefined){
        resultInfo.err = 1;
        cb(null, 4272, "SC_Enter_Big_Match_Room", resultInfo);
        return;
    }
    var rpcB = rpcManager.getRpcByRType('BigMatchServer');
    if (rpcB) {
        var method = rpcB.getMethod('joinBigMatchById');
        method(global.serverId, uid, data, function (err, matchServerId) {
            console.log("==joinBigMatchById==>err, matchServerId: ", err, matchServerId);
            if(err != undefined && err != null){
                resultInfo.err = 2;
                if(err == 3){ /// 比赛还未开始
                    resultInfo.err = 3;
                }
                else if(err == 101){ /// 金币不足
                    resultInfo.err = 4;
                }
                cb(null, 4272, "SC_Enter_Big_Match_Room", resultInfo);
                return;
            }

            var rpc = rpcManager.getRpcByServerId(matchServerId);
            if (!rpc) {
                logger.err('mods[272]: failed to get rpcServer. Id: ' +matchServerId);
                // TODO: 如何做异常处理 by wdl(2017.06.16)
            }
            rpc.getMethod('msgPacketTrans')('join', uid, [data.matchType], function (err, result) {
                console.log("==msgPacketTrans(enterRoom)==>err: ", err);
                if(err != undefined && err != null){
                    resultInfo.err = 5;
                    cb(null, 4272, "SC_Enter_Big_Match_Room", resultInfo);
                    return;
                }
                storeRoomServer(sid, uid, matchServerId, {type: 12});
                resultInfo = result;  ///重新赋值(可能会覆盖原有结构)
                resultInfo.err = 0;

                //console.log("==>>>>>>>>Send To Client Data: userList: ",resultInfo.userList);
                cb(null, 4272, "SC_Enter_Big_Match_Room", resultInfo);
            });
        });
    }
};

//获取个人数据(退出房间后调用)
mods["273"] = function (sid, uid, data, cb){
    console.log("==mods[273]==>uid ,data= ", uid, data);
    var resultInfo = {err: 0,scoreList :[]};

    var rpcQ = rpcManager.getRpcByRType('BigMatchServer');
    if (rpcQ == undefined || rpcQ == null) {
        resultInfo.err = 1;
        cb(null, 4273, "SC_Big_Match_PlayerScore", resultInfo);
        return;
    }
    var method = rpcQ.getMethod('getBigMatchScore');
    method(uid, function (err, result) {
        console.log("==mods[273]==>err ,result= ", err, result);
        if(err || result == null){
            resultInfo.err = 2;
            cb(null, 4273, "SC_Big_Match_PlayerScore", resultInfo);
            return;
        }

        resultInfo.scoreList = result;
        cb(null, 4273, "SC_Big_Match_PlayerScore", resultInfo);
    });
};

//重新进入比赛 againEnterMatch
mods["280"] = function (sid, uid, data, cb){

    var rpcQ = rpcManager.getRpcByRType('MatchQueueServer');
    console.log('["280"]--->uid: '+  uid + " rpcQ ="+ rpcQ);

    if (!rpcQ) {
        cb(null, 4280, "SC_AgainEnterMatch", { code: 2});
        return;
    }

    var method = rpcQ.getMethod('againEnterMatch');
    if (!method) {
        cb(null, 4280, "SC_AgainEnterMatch", { code: 3});
        return;
    }

    method(uid, global.serverId, function (info) {
        //console.log('++=mods["280"]==++==>info: ', info);
        if(info ===  undefined || info === null){
            cb(null, 4280, "SC_AgainEnterMatch", { code: 0});
        }else {
            storeRoomServer(sid, uid, info.matchServerId);
            cb(null, 4280, "SC_AgainEnterMatch", {
                time: info.time,
                pathinfo: info.pathinfo,
                tracktime: info.tracktime,
                deadfishs: info.deadfishs,
                userList: info.userList,
                taskFishReward: info.taskFishReward,
                targetTaskFishNum: info.targetTaskFishNum,
                taskFishType: info.taskFishType,
                showTop: info.showTop,
                code: 1
            });
        }
    });
}


//技能
mods["601"] = function (sid, uid, data, cb) {
    log("601 --- uid = "+ uid);
    var trans = getRoomServerTrans(sid);
    if (trans) {
        trans('useSkill', uid, [data.skillId, data.isOpen], function (err, skillId) {
            if (skillId == undefined || skillId == null) {
                skillId = 0;
            }
            cb(null, 4601, "SC_UseSkill", {skillId: data.skillId, isUsable: data.isOpen, code: 1, costType: 1});
        });
    }
};

/// 获取破产补助数据
mods["803"] = function (sid, uid, data, cb){
    var result = {errCode: 0, isPreGetSubsidy : 0, stateNumber: 0,startTime: 0,nowTime: 0};
    var trans = getRoomServerTrans(sid);
    console.log("+++++++++++mods[803] ===>trans");
    if (trans) {
        trans('subsidy', uid, [],function (err, info) {
            console.log("+++++++++++mods[803] ===>err,info: ",err, info);
            if(err != undefined || err != null || info == null){
                result.errCode = err;
                cb(null, 4803, "SC_Subsidy_Sync", result);
            }

            result.isPreGetSubsidy =  info.isPreGetSubsidy;
            result.stateNumber = info.subsidyNum;
            result.startTime = info.startTime;
            result.nowTime = Math.floor(Date.now() / 1000);
            cb(null, 4803, "SC_Subsidy_Sync", result);
        });
    }
};
///发放破产补助
mods["804"] = function (sid, uid, data, cb){
    var result = {errCode: 0, isGetSubsidy: 0, stateNum: 0};
    var trans = getRoomServerTrans(sid);
    console.log("+++++++++++mods[804] ===>trans");
    if (trans) {
        trans('subsidyReward', uid, [],function (err, info) {
            console.log("+++++++++++mods[804] ===>err,info: ",err, info);
            if(err != undefined || err != null || info == null){
                result.errCode = err;
                cb(null, 4804, "SC_SubsidyReward", result);
            }

            result.isGetSubsidy = 1;
            result.stateNum = info.subsidyNum;
            cb(null, 4804, "SC_SubsidyReward", result);
        });
    }
};


module.exports = function (_session, _rpcManager, _redis) {
    session = _session;
    rpcManager = _rpcManager;
    redis = _redis;
    return mods;
};

/**
 *  根据sid获取向后端RoomServer发送消息的rpc方法
 * */
function getRoomServerTrans(sid) {
    var roomServerId = session.get(sid, SESSION_FIELD_ROOM_SERVER_ID);
    if (!roomServerId) {
        logger.err('battle.getRoomServerTrans: invalid roomServerId. sid:' +sid);
        return null;
    }
    var rpc = rpcManager.getRpcByServerId(roomServerId);
    if (!rpc) {
        logger.err('battle.getRoomServerTrans: failed to get rpcServer. Id:' +roomServerId);
        return null;
    }
    return rpc.getMethod('msgPacketTrans');
}
/**
 *  根据sid获取向后端RoomServer发送消息的rpc方法
 *  fastMatch
 *  {
 *      serverId:serverId,
 *      matchId:matchId,
 *      roomId:roomId
 *  }
 * */
function getFastMatchServerTrans(sid) {
    var fastMatch = session.get(sid, SESSION_FIELD_FAST_MATCH_INFO);
    if (!fastMatch) {
        logger.err('battle.getFastMatchServerTrans: invalid fastMatch. sid:' +sid);
        return null;
    }

    var rpc = rpcManager.getRpcByServerId(fastMatch.serverId);
    if (!rpc) {
        logger.err('battle.getFastMatchServerTrans: failed to get rpcServer. Id:' +fastMatch.serverId);
        return null;
    }
    return rpc.getMethod('msgPacketTrans');
}
/**
 *
 * @param sid
 * @param uid
 * @param serverId
 * @param param  前端直接杀进程,传房间类别(10: 经典\11: 比赛\12: 大奖赛)
 */
function storeRoomServer(sid, uid, serverId, param) {

    session.set(sid, SESSION_FIELD_LEAVE_ROOM, session.addOnDeleteSession(sid, function () {
        if(param == undefined){
            param = {}
        }
        mods[205](sid, uid, param, nop);
    }));
    session.set(sid, SESSION_FIELD_ROOM_SERVER_ID, serverId); //玩家所处的后端服务器id 记录到session中
}

function clearRoomServer() {
}