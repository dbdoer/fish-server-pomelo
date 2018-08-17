/**
 * Created by 李峥 on 2016/3/24.
 * 在FrontServer中的roomManager
 *
 *     定时从MasterServer中获取RoomServer信息
 *     解析存储从MasterServer中获取的信息
 *     根据RoomServer信息向client分配后端服务器 并存储分配信息
 */


var masterId;
var localServerId;



var logger = require("../common/logHelper").helper;



module.exports = function (rpcManager, master, local) {
    masterId = "MasterServer:" + master.host + ":0:" + master.port;
    localServerId = local;
    return new RoomManager(rpcManager);
};

function RoomManager(rpcManager, master) {
    this.rpcManager = rpcManager;
    this.rooms = {}; //所有房间信息存储

    var self = this;
    this.syncTimer = setInterval(function () {
        self.syncRoomInfo.apply(self);
    }, 2000); //每2s进行一次房间数据更新
}

//向MasterServer请求
RoomManager.prototype.syncRoomInfo = function () {
    //console.log("FrontServer.RoomManager.syncRoomInfo: entered. masterId=" +masterId);
    var self = this;
    var masterServer = this.rpcManager.getRpcByServerId(masterId);
    if (!masterServer) {
        logger.err('FrontServer.RoomManager.syncRoomInfo: failed to getRpcByServerId, masterId=' +masterId +' masterServer=' +masterServer);
        return;
    }

    var func = masterServer.getMethod("getRoomStatus");
    if (!func) {
        logger.err('FrontServer.RoomManager.syncRoomInfo: failed to getMethod(getRoomStatus), masterServer:' +masterServer);
        return;
    }

    func(function (info) {
        //从MasterServer获取到的room服务器内容
        self.roomInfo = formatRoomInfo(info);
        //console.log('FrontServer.RoomManager.syncRoomInfo: roomInfo.servers: ' +JSON.stringify(self.roomInfo.servers));
    });
    //console.log("FrontServer.RoomManager.syncRoomInfo: leaved.");
};

/**
 * 分配房间(限normal类型的房间 大亨&自定义直接通过房间id进入)
 * 根据各个RoomServer的信息获得一个最优的RoomServer
 * 然后向RoomServer请求加入一个player
 * 然后向RoomServer请求加入某一类房间
 * 返回房间信息(房间本身&其中的玩家)后向client返回结果
 * @param type{Number} 房间类型 normal房间
 * @param uid{String} 要进入房间的玩家的uid
 * @param cb{function} 由于有rpc通信 此函数为耗时操作 结果需要以callback的形式返回
 * @return {boolean} 如果有异常出现则返回false 没有则是true
 * */
RoomManager.prototype.allocateRoom = function (type, roomId, user, cb) {
    console.log("FrontServer.RoomManager.allocateRoom: entered. type=" + type);

    var serverId = this.getBalanceServer(type);
    if (!serverId) {
        logger.err('FrontServer.RoomManager.allocateRoom: serverId is null');
        cb(2001);
        return;
    }
   // var server = this.rpcManager.getRpcByServerId(serverId); //如果拿到了rpcClient 那就当做肯定能够获取到远程方法
    this.onEnterRoomServer(serverId, type);
    user.setRoomServerId(serverId);
    var self = this;
    var data = {    gold: 0
                    ,gem: 0
                    ,vipLv: 0
                    ,rechargeCoefficient: 0
                    ,noviceCoefficient: 0
                    ,costQuota: 0
                    ,costquotaPool:0
                    ,nickname: ''
                    ,headImage: 0
                    ,FBheadImage:""
                    ,FBnickname:""
                    ,curSkinId: 0
                    ,level: 0
                    ,experience: 0
                    ,cardBoxPropRate:0
                    ,guideStep:0
    };
    for(var k in data){
        data[k] = user.getValue(k);
    }
    console.log("FrontServer.RoomManager.allocateRoom: before rpcTrans(addPlayer), serverId:" +serverId +", localServerId:" +localServerId);
    user.rpcTrans("addPlayer", [localServerId, data], function (err, data) {
        if (err) {
            logger.err('FrontServer.RoomManager.allocateRoom: error to rpcTrans(addPlayer): ' +err);
            cb(err);
            return;
        }
        //第一个null是roomId 第二个null是密码z
        user.rpcTrans("enterNormalRoom", [type, roomId, null], function (err, data) {
            if (err) {
                logger.err('FrontServer.RoomManager.allocateRoom: error to rpcTrans(enterNormalRoom): ' +err);
                cb(err);
                return;
            }
            console.log('FrontServer.RoomManager.allocateRoom: after enterNormalRoom, serverId: ' +serverId);
            data.roomServerId = serverId;
            cb(err, data);
        });
    });
};

//创建自定义房间
RoomManager.prototype.leaveRoom = function () {

}



//rpc trans
RoomManager.prototype.getDataTransByUser = function ( user ) {
    var serverId = user.getRoomServerId();
    if (!serverId) {
        logger.err('FrontServer.RoomManager.getDataTransByUser: invalid serverId.');
        return null;
    }
    var rpc = this.rpcManager.getRpcByServerId(serverId);
    if (!rpc) {
        logger.err('FrontServer.RoomManager.getDataTransByUser: failed to getRpcByServerId, serverId:' +serverId);
        return null;
    }

    return rpc.getMethod('msgPacketTrans');
}


//创建自定义房间
RoomManager.prototype.createCustomRoom = function () {

};

//进入某个特定的房间(包括进入大亨&自定义房间 和回到之前的普通房间 ps 普通房间第一次进入不能通过roomId进入)
RoomManager.prototype.enterSpecificRoom = function (roomId, uid) {
};

//统计信息 用于返回客户端查看
RoomManager.prototype.getNormalRoomInfo = function () {
    return this.roomInfo.statistics.normal;
};

/* *
 * 格式化从master获取信息
 * FrontServer存储的房间信息结构
 * {
 *      statisticsData:{
 *          normal:{
 *              type1:totalCount1,
 *              type2:totalCount2,
 *              type3:totalCount3
 *          }
 *      },
 *      servers:{
 *          serverId1:{
 *              normal:{
 *                  type1:可用人数1,
 *                  type2:可用人数2,
 *                  type3:可用人数3
 *              },
 *              total:服务器总人数,
 *              rooms:{ //大亨和自定义房间
 *                  roomId:id,
 *                      .
 *                      .
 *                      .
 *              }
 *          }
 *      }
 * }
 * @param {object} 从MasterServer获取到的房间信息
 * @return {object} 解析完成的房间信息 包括一些分析后的数据
 * */
function formatRoomInfo(info) {
    //logger.info("FrontServer.RoomManager.formatRoomInfo: entered. info: " +JSON.stringify(info));

    var servList = {};//各个RoomServer的统计数据和部分可能会用到的详细数据
    var statisticsData = {
        normal: {}
    }; //总体统计数据 用来查看

    for (var serverId in info) {
        console.log('FrontServer.RoomManager.formatRoomInfo: serverId=', serverId);

        var server = parseRoomInfo(info[serverId]);
        if (!server) {
            logger.err('FrontServer.RoomManager.formatRoomInfo: error to parseRoomInfo, serverId:' +serverId);
            continue;
        }

        console.log('FrontServer.RoomManager.formatRoomInfo: server=', server);

        servList[serverId] = {
            total: server.playerCount,
            normal: server.rooms
        };

        console.log('FrontServer.RoomManager.formatRoomInfo: servList=', servList[serverId]);

        for (var type in server.rooms) {
            if (!statisticsData.normal[type]) {
                statisticsData.normal[type] = 0;
            }
            statisticsData.normal[type] += server.rooms[type];
        }
    }

    console.log('FrontServer.RoomManager.formatRoomInfo: statisticsData=', statisticsData);

    //logger.info("FrontServer.RoomManager.formatRoomInfo: leaved. servList: " +JSON.stringify(servList));

    return {
        servers: servList,
        statistics: statisticsData
    };
}


/**
 * 如果server中有type类型的房间没满 找到这些server中当前总人数最少的
 * 如果没有server中有没满的type类型的房间 找到所有server中当前总人数最少的
 * @param type{int} 需要的房间类型(目前仅包括普通类型)
 * @return {String} 返回一个serverId
 * */
RoomManager.prototype.getBalanceServer = function (type) {
	var self = this;
	var server = null; //目标RoomServer
	var min = 10; //type类型最低人数
	var max = 100; //房间人数最高
	var maxServers = []; //比房间人数最高人数多的RoomServer
	var minServers = []; //比type类型最低人数多的RoomServer
	var zeroServers = []; //type类型无的RoomServer
	//遍历，RoomServer最少的ServerID
	function getServer (servers) {
	    var retServer = null;
		for (var i = 0; i < servers.length; i++) {
			var serverId = servers[i];
			var cursvr = self.roomInfo.servers[serverId];
			if (i === 0) {
				retServer = serverId;
				continue;
			}
			if (cursvr.total < self.roomInfo.servers[retServer].total) {
				retServer = serverId;
			}
		}
		return retServer;
	}
	//循环遍历所有存在的server
	for (var serverId in this.roomInfo.servers) {
	    var cursvr = this.roomInfo.servers[serverId];
	    if (cursvr.total > max) {
	        maxServers.push(serverId);
	        continue;
	    }
	    if (cursvr.normal[type] > 0) {
	        if (cursvr.normal[type] > min) {
		        minServers.push(serverId);
		        continue;
	        }
	        server = serverId;
	        break;
	    }
	    zeroServers.push(serverId);
	}
	do {
	    if (server) {
	        break;
	    }
	    if (zeroServers.length) {
		    server = getServer(zeroServers);
		    break;
	    }
	    if (minServers.length) {
	        server = getServer(minServers);
	        break;
	    }
	    server = getServer(maxServers);
	} while (false);
	return server;
};

/**
 * @description 进入房间时临时增加，为了动态分配
 * @param {String} serverId
 * @param {Number} type
 * @return {boolean}
 */
RoomManager.prototype.onEnterRoomServer = function (serverId, type) {
    var objServer = this.roomInfo.servers[serverId];
    if (!objServer) {
        return false;
    }
        objServer.total++;
    if (!objServer.normal[type]) {
        objServer.normal[type] = 1;
    } else {
        objServer.normal[type]++;
    }
    if(!this.roomInfo.statistics.normal[type]) {
        this.roomInfo.statistics.normal[type] = 1;
    } else {
        this.roomInfo.statistics.normal[type]++;
    }
    return true;
};

/**
 * 传入一个房间信息 解析返回
 * TODO 开发阶段 不进行压缩 数据结构稳定之后进行压缩
 * @param  r {Number} 压缩过的房间信息
 * */
function parseRoomInfo(r) {
    //var room = {};
    //room.pwd = r & 1;
    //room.current = r & 30 / 2;
    //room.limit = r & 480 / 32;//人数限制
    return r;
}
