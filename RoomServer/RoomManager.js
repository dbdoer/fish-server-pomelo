/**
 * Created by ck01-441 on 2016/3/4.
 * 管理所有Room  server实例中唯一
 * 对room进行创建-维护-销毁
 *
 * 保存所有room信息 并向MasterServer进行同步
 * 当房间信息发生改变时立刻向MasterServer通知
 */
function nop() {
}
//var redis = require("../database/redis").getCluster();
var redis = require("../dao/redis/redisCmd");
var roomInfoDao = require("../dao/roomInfoDao");
var uuid = require("uuid");
var ThemeRoom = require("./ThemeRoom.js");
var logger = require("../common/logHelper").helper;
var ROOM_LIMIT = 500; //房间上限 待测试
var NOTIFY_INTERVAL = 3000;//同步房间数据最长间隔
var REFRESH_TRACK_INTERVAL = 1000;// 刷新track信息间隔
var BROADCAST_TRACK_INFO = 15000;// 广播track信息间
var REDIS_PROFIT_STORAGE = "fish4Profit"

var roomManager = null;

var serverId;
var master;
module.exports = function (rpcManager, _serverId, _master) {
    serverId = _serverId;
    master = _master;
    if (roomManager == null) {
        roomManager = new RoomManager(rpcManager);
    }
    return roomManager;
};

function RoomManager(rpcManager) {
    this.rpcManager = rpcManager;
    this.roomList = {}; //房间容器{id:room}
    this.roomCount = 0; //当前房间数量
    this.saveRoomInfo = {}; //删除房间前保存部分数据(goldPool,taskFishNum)

    this.roomType = {}; // {type:[id1, id2]} 类型对应id列表
    this.roomTypePlayerCount = {};  //各个场次下的人数统计
    var self = this;
    this.tick = 0;
    this.refreshInterval = setInterval(function () {
        self.update();
    }, REFRESH_TRACK_INTERVAL); //RoomServer实例公用定时器
    this.notifyMaster();
    this.initRoomInfo();
}

RoomManager.prototype.initRoomInfo = function(){
    var self = this;
    roomInfoDao.load(function(err, result) {
        if(err || result == null){
            return;
        }
        self.saveRoomInfo = result;
    })
};

/* *
 * 只有当get不到available room并且现有room没有达到max时调用
 * 也可以由FrontServer直接调用创建自定义房间
 * @param {Number}type 房间类型 根据类型读取配置
 * @param pwd{String} 房间密码 可以为空
 * @return {Room}返回一个房间对象
 * */
RoomManager.prototype.createRoom = function (type, pwd) {
    logger.debug('RoomServer.RoomManager.createRoom: entered. type=' +type);
    var self = this;
    if (!this.roomType[type]) {
        this.roomType[type] = [];
    }

    var options = {
        roomId: buildRoomId(),
        type: type
    }; //房间配置
    var info = this.getSaveTaskFishAndGoldPoolInfo(type);
    var room = ThemeRoom(this, options);
    /// 找到合适的数据则赋值,不然就跳过
    if(info != undefined && info != null && Object.keys(info).length > 0){
        if(room.againInit(info) >= 0){
            /// 赋值成功后删除之前保存的数据
            if(this.deleteSaveRoomInfo(type, info.oldRoomId) < 0){
                logger.info('====>deleteSaveRoomInfo return < 0!!');
            }
        }
    }
    room.on("close", function () {
        // 房间关闭时 清空记录并向MasterServer发出通知
        var id = room.roomId;
        self.saveTaskFishAndGoldPoolByRoomId(id, type);
        self.releaseRoom(id, type);
        self.notifyMaster();
    });
    room.on("enter", function () {
        //有人进入房间
    });
    room.on("leave", function (playerUid) {
        //有人离开房间
        logger.info('====>Have Player Leave Of Normal Match Room, Uid = %s !!', JSON.stringify(playerUid));
    });
    this.roomList[room.roomId] = room;
    this.roomType[type].push(room.roomId);
    this.roomCount++;
    logger.debug('RoomManager createRoom: leaved.');
    return room;
};
/**
 *
 * @param type
 * @param roomId
 * @returns {{err: number}}
 */
RoomManager.prototype.getMatchOfRoom = function (matchType, roomId){
    var res = {err: 0};
    if(this.roomType == undefined || this.roomType[matchType] == undefined){
        res.err = 1;
        return res;
    }
    var index = this.roomType[matchType].indexOf(roomId);
    if(index < 0){
        res.err = 2;
        return res;
    }
    var roomInfo = this.roomList[roomId];
    if(roomInfo == undefined){
        res.err = 2;
        return res;
    }
    /// 房间满员或少于1个位置的视为不可进
    if(roomInfo.status > 0 || roomInfo.playerCount >= roomInfo.size-1){
        res.err = 3;
        return res;
    }
    return res;
};
/**
 * 根据类型返回一个可用的room 因为大亨和自定义都是进入指定id的房间 所以这个只有normal会用到
 * @param type{Number} 房间类型
 * @return {Room} 返回一个房间对象
 * */
RoomManager.prototype.getAvailableRoom = function (type) {
    logger.debug('RoomServer.RoomManager.getAvailableRoom: entered. type = ' + type);
    var typeList = this.roomType[type];
    if (!typeList) {
        logger.err('RoomServer.RoomManager.getAvailableRoom: null type list');
        typeList = [];
        this.roomType[type] = typeList;
    }
    var availableRoom;
    //目前是找到第一个能进的就进去 TODO 改进为其他策略(不一定需要)
    for (var k in typeList) {
        var r = this.roomList[typeList[k]];
        var status = r.status;
        if (status == 0) {
            availableRoom = r;
            break;
        }
    }

    if (!availableRoom) {
        //availableRoom = this.createRoom(type); //没有找到合适的room则创建一个
        availableRoom = this.createRoom(type, null, null);
    }

    logger.debug("RoomServer.RoomManager.getAvailableRoom: leaved.");
    return availableRoom;
};

/**
 * 获取一个指定roomId的房间
 * @param roomId{string} 指定的roomId
 * @return {Room|null} 获取到的指定房间对象 没有返回null
 * */
RoomManager.prototype.getSpecificRoom = function (roomId) {
    return this.roomList[roomId] ? this.roomList[roomId] : null;
};

//定时刷新所有room 定时器 具体刷新操作在room内完成
RoomManager.prototype.update = function () {
    for (var roomId in this.roomList) {
        //console.log('room id = ' + roomId);
        //logger.debug('room id = ' + roomId);
        this.roomList[roomId].update();
    }

    this.tick ++;//秒数

    //this.timeWriteTax();
};

/**
 *  释放room
 * */
RoomManager.prototype.releaseRoom = function (id, type) {
    delete this.roomList[id];
    var index = this.roomType[type].indexOf(id);
    this.roomType[type].splice(index, 1);
};

//向MasterServer同步房间信息
RoomManager.prototype.notifyMaster = function () {
    //logger.info('RoomServer.RoomManager.notifyMaster: entered.');
    var self = this;
    clearTimeout(this.notifyTimer);
    this.notifyTimer = setTimeout(function () {
        self.notifyMaster.apply(self);
    }, NOTIFY_INTERVAL); //最迟30s同步一次 其他时候进行同步立刻重置计时器
    var rpcServer = this.rpcManager.getRpcByServerId("MasterServer:" + master.host + ":0:" + master.port);
    if (!rpcServer) {
        logger.err('RoomServer.RoomManager.notifyMaster: failed to get rpcServer. Id:');
        return;
    }
    var sync = rpcServer.getMethod("syncRoomStatus");
    if (!sync) {
        logger.err("RoomServer.RoomManager.notifyMaster: failed to getMethod(syncRoomStatus).");
        return;
    }

    var rooms = {};

    for (var k in this.roomType) {
        rooms[k] = 0;
        for (var index in this.roomType[k]) {
            //rooms[k][id] = buildRoomInfo(this.roomList[id]);
            rooms[k] += this.roomList[this.roomType[k][index]].playerCount;
        }
    }

    this.roomTypePlayerCount = rooms;
    //sync(serverId, createFakeData());
    sync(serverId, {
        playerCount: this.msgDispatcher.getPlayerCount(),
        rooms: rooms
    });

};

RoomManager.prototype.saveTaskFishAndGoldPoolByRoomId = function (roomId, matchType) {
    if(roomId == undefined || matchType == undefined){
        return -1;
    }

    if(this.roomList[roomId] == undefined){
        /// 房间不存在
        return -2;
    }

    if(this.saveRoomInfo[matchType] == undefined){
        this.saveRoomInfo[matchType] = {}
    }
    var matchSaveRoom = this.saveRoomInfo[matchType];
    if(matchSaveRoom[roomId] != undefined){
        /// 房间已经保存
        return -3;
    }
    var nowTime = Math.floor(Date.now() /1000);
    var roomInfo = this.roomList[roomId];
    var tempSaveInfo = {goldPool: 0, taskFishIdOfPos: {}, saveTime: nowTime};
    tempSaveInfo.goldPool = roomInfo.goldPool;
    tempSaveInfo.taskFishIdOfPos = roomInfo.taskFishIdOfPos;

    matchSaveRoom[roomId] = tempSaveInfo;
    roomInfoDao.write(this.saveRoomInfo, function() { });

    return 0;
};
RoomManager.prototype.getSaveTaskFishAndGoldPoolInfo = function (matchType) {
    if(matchType == undefined){
        return ;
    }
    if(this.saveRoomInfo[matchType] == undefined){
        return ;
    }

    var tGoldPool = 0, tSaveTime = 0;
    var tempRoomId = 0;
    var nowTime = Math.floor(Date.now() /1000);
    for(var key in this.saveRoomInfo[matchType]){
        var mRoomInfo = this.saveRoomInfo[matchType][key];
        ///是否存在
        if(mRoomInfo == undefined){
            continue;
        }
        /// 时间超12小时则删除数据
        if(mRoomInfo.saveTime + 12 * 3600 < nowTime){
            delete this.saveRoomInfo[matchType][key];
            //console.log("======delete this.saveRoomInfo==>matchType: ",matchType,key)
            continue;
        }
        if(mRoomInfo.goldPool > tGoldPool){
            tGoldPool = mRoomInfo.goldPool;
            tSaveTime = mRoomInfo.saveTime;
            tempRoomId = key;
        }
        else if(mRoomInfo.goldPool == tGoldPool){
            if(nowTime - mRoomInfo.saveTime > nowTime - tSaveTime){
                tempRoomId = key;
            }
        }
    }
    var info = this.saveRoomInfo[matchType][tempRoomId];
    if(info == undefined){
        return {};  /// 未找到返回空对象
    }else {
        info.oldRoomId = tempRoomId;
        return info;
    }
}
RoomManager.prototype.deleteSaveRoomInfo = function (matchType, roomId){
    if(this.saveRoomInfo[matchType] == undefined){
        return -1;
    }
    if(this.saveRoomInfo[matchType][roomId] == undefined){
        return -2;
    }
    delete this.saveRoomInfo[matchType][roomId];
    return 0;
}

//假数据 用于测试
function createFakeData() {
    var rooms = {};
    var total = 0;
    for (var i = 0; i < 12; i++) {
        rooms[i] = Math.ceil(Math.random() * 50 + 1);
        total += rooms[i];
    }

    return {
        playerCount: total,
        rooms: rooms
    };
}

RoomManager.prototype.setPlayerManager = function (playerManager) {
    this.msgDispatcher = playerManager;
};

function buildRoomId() {
    return uuid.v1();//serverId + "$" + uuid.v1();
}

/**
 * 根据room信息生成信息码 TODO 开发期间不使用压缩 待数据结构稳定之后再进行压缩
 *
 * room:0~2047整数  11     1111     1111        1
 *               类型  最大人数  当前人数  是否有密码
 *
 *    type - 1536 - 512
 *    0 - 0
 *    1 - 512
 *    2 - 1024
 *
 *    limit - 480 - 32
 *    1 - 32
 *    2 - 64fcc cf
 *    3 - 96
 *    4 - 128
 *    5 - 160
 *    6 - 192
 *    7 - 224
 *    8 - 256
 *
 *    current - 30 - 2
 *    0 - 0
 *    1 - 2
 *    2 - 4
 *    3 - 6
 *    4 - 8
 *    5 - 10
 *    6 - 12
 *    7 - 14
 *    8 - 16
 *
 *    pwd - 1
 *    0 - 0
 *    1 - 1
 * */
function buildRoomInfo(room) {
    //var roomCode = 0;
    //if (room.pwd) {
    //    roomCode += 1;
    //}
    //
    //roomCode += 2 * room.playerCount;
    //
    //roomCode += 32 * room.size;
    //
    //roomCode += 512 * room.type;
    //
    //return roomCode;
    return room;
}


/**
 * 统计系统中盈利
 */
RoomManager.prototype.totalRoomTax= function () {
    var typeList = this.roomList;
    var ret = {};
    for (var k in typeList) {
        var r = typeList[k];
        if(r){
            if(!ret[r.typeId]){
                ret[r.typeId] = 0;
            }

            ret[r.typeId]  += r.getTaxTotal().currentProfitEP;
        }
    }

    return ret;
}
//获取指定类型房间的盈利值
RoomManager.prototype.roomTax= function (roomType) {
    var typeList = this.roomList;
    //console.log('=0000000000=sendFullServerNotice==>typeList',typeList);
    var ret = {};
    for (var k in typeList) {
        var r = typeList[k];
        if(r && r.typeId == roomType){
            if(!ret[r.typeId]){
                ret[r.typeId] = {};
            }
            //console.log('---------------------r.getTax(roomType).state',r.getTax(roomType).state);
            if(!ret[r.typeId].normalState){
                ret[r.typeId].normalState  = 0
            }
            if(!ret[r.typeId].killState){
                ret[r.typeId].killState  = 0
            }
            if(!ret[r.typeId].eliminateState){
                ret[r.typeId].eliminateState  = 0
            }
            if(r.getTax(roomType).state == 0){
                ret[r.typeId].normalState  +=1
            }
            if(r.getTax(roomType).state == 1){
                ret[r.typeId].killState  +=1  //抽水状态
            }
            if(r.getTax(roomType).state == -1){
                ret[r.typeId].eliminateState  +=1   ////放水状态
            }
            //ret[r.typeId].state  = r.getTax(roomType).state;
            ret[r.typeId].currentProfitEP  = 0+r.getTax(roomType).currentProfitEP;
            ret[r.typeId].coefficient  = r.getTax(roomType).coefficient;
            ret[r.typeId].playerCount  = this.roomTypePlayerCount[r.typeId];
        }
    }
    //console.log('---------------------ret[roomType]',ret[roomType]);
    return ret[roomType];
}

/**
 * 10分钟统计一次
 */
RoomManager.prototype.timeWriteTax= function () {
    if(this.tick%10 /*% 60/60*/){
        return;
    }
    var dateNow = new Date();
    var now = Date.now();
    var month = dateNow.getMonth()*1+1;
    var taxs = this.totalRoomTax();
    //console.log("-----------------------taxs",taxs);
    var storeTime = JSON.stringify(dateNow.getFullYear())+JSON.stringify(dateNow.getMonth()+1)+JSON.stringify(dateNow.getDate())+JSON.stringify(dateNow.getHours());
    //console.log("-----------------------storeTime",storeTime);
    if(taxs){
        //logger.info('total fax = '+ month+':'+dateNow.getDate()+':'+dateNow.getHours()+':'+dateNow.getMinutes()+':'+dateNow.getSeconds()+':'+JSON.stringify(taxs));
        /*redis.hmset(REDIS_PROFIT_STORAGE +storeTime,taxs, function () {
            redis.keys(REDIS_PROFIT_STORAGE + "*" , function (err,ret) {
                console.log("-----------------------ret",ret);
                for(var i = 0;i < ret.length; i++){
                    var time = ret[i];
                    redis.hgetall(ret[i], function (err,result) {
                        console.log("-----------------------time",time);
                        console.log("-----------------------result",result);
                    });
                }

            });

        });*/
        redis.hset(REDIS_PROFIT_STORAGE ,now,JSON.stringify(taxs), function () {
            redis.hgetall(REDIS_PROFIT_STORAGE, function (err,result) {
                //console.log("-----------------------result",result);
            });
        });
    }
}

/*
RoomManager.prototype.changeCoefficient = function(roomType,gmCoefficient){
    //console.log('------------------------gmCoefficient',gmCoefficient);
    ThemeRoom.changeCoefficient(roomType,gmCoefficient);
}*/
