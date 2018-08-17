/**
 * 登录调用
 */
function nop() {
}

var LOGIN_TIMER = 5000; //登录超时 暂设5000ms
var REDIS_KEY_ONLINE_USER_LIST = "fish4online_users:";

var redis;

var _uuid = require("uuid");

function login(uid, cb) {
    if (!cb)cb = nop;

    var uuid = _uuid.v1();
    global.loginuuid[uid] = {
        uuid: uuid,
        timer: setTimeout(function () {
            delete global.loginuuid[uid];
            //删除online_user中的记录
            redis.lrem(REDIS_KEY_ONLINE_USER_LIST + global.serverId, 0, uid);
        }, LOGIN_TIMER)
    };
    cb(uuid);
}

module.exports = function (_redis) {
    redis = _redis;
    return {
        login: login
    };
};