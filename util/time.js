/**
 * time.js
 *
 * @author <a href="xiaoxing.li@chukong-inc.com">xiaoxing.li</a>
 * @since 2015-08-26
 */
var Time = module.exports;
var moment = require("moment");
/**
 * 获取当前时间(单位: 秒)
 */
Time.localtime = function () {
    return Math.ceil(Date.now() / 1000);
};

/**
 *是否已经过期
 * @param dbTimeStamp
 * @param duration
 * @param key
 * @returns {*}
 */
Time.isExpire = function (dbTimeStamp, duration, key) {
    key = key || 'd';
    var dbMoment = moment(parseInt(dbTimeStamp) * 1000);
    dbMoment.add(duration, key);
    return moment().isAfter(dbMoment);
};