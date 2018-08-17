/**
 * Created by 李峥 on 2016/4/20.
 * 汇总所有module中的rpc调用
 */
var FastMatch = require('./FastMatch.js');
module.exports = function (redis, rpcManager, rpcServer) {

    var fastMatch = new FastMatch(rpcServer, rpcManager);

    return {
        onServerChanged: function (type, serverId) {
            if (type > 0) {
                fastMatch.addServer(serverId);
            } else {
                fastMatch.removeServer(serverId);
            }
        }
    }
};