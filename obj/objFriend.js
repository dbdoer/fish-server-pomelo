/**
 *  friend
 */

var util = require('util');
var Obj = require('./obj');
var friendjson = require('./json/friend.json');
var friendDao = require('../dao/friendDao.js');


var ObjFriend = function () {
    Obj.call(this);

    this.name = "friend";
    this.data.initTemplate(friendjson);
};
util.inherits(ObjFriend, Obj);

//进行数据库读档操作
ObjFriend.prototype.loadFromDb = function (cb) {
    friendDao.load(this, function(err, ret){
        cb(err, ret);
    });
}
//进行数据库删档操作
ObjFriend.prototype.delFromDb = function (selfUid, friendUid, cb) {
    friendDao.deleteByUid(selfUid, friendUid, function(err, ret){
        cb(err, ret);
    });
}
/**
 * Expose 'ObjFriend' constructor.
 */
module.exports = ObjFriend;