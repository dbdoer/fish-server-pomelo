/**
 *  friend
 */

var util = require('util');
var Obj = require('./obj');
var friendReqJson = require('./json/friendReq.json');
var friendReqDao = require('../dao/friendReqDao');


var ObjFriendReq = function () {
    Obj.call(this);

    this.name = "friendReq";
    this.data.initTemplate(friendReqJson);
};
util.inherits(ObjFriendReq, Obj);

//数据库进行读档操作
ObjFriendReq.prototype.loadFromDb = function (cb) {
    friendReqDao.load(this, function(err, ret){
        cb(err, ret);
    });
}

/**
 * Expose 'ObjFriendReq' constructor.
 */
module.exports = ObjFriendReq;