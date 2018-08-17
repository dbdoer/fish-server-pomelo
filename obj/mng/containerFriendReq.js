/**
 * friend container
 */
var util = require('util');
var container = require('./containerBase');
var ObjFriendReq = require('../objFriendReq');
/**
 * container
 */
var ContainerFriendReq = function() {
    this.__type = "ContainerFriendReq";
    container.call(this);
};
util.inherits(ContainerFriendReq, container);
/**
 * Expose constructor.
 */
module.exports = ContainerFriendReq;

ContainerFriendReq.prototype.add = function(obj) {
    return this.m_Array.push(obj);
}

ContainerFriendReq.prototype.del = function(guid) {
    return this.del(guid);
}
ContainerFriendReq.prototype.fromDb = function(reply) {
    for(var k in reply){
        var _db = reply[k];
        var _friendReq = new ObjFriendReq();
        _friendReq.fromDB(JSON.parse(_db));

        this.add(_friendReq);
    }
}