/**
 * friend container
 */
var util = require('util');
var container = require('./containerBase');
var ObjFriend = require('../objFriend');
/**
 * container
 */
var ContainerFriend = function() {
    this.__type = "ContainerFriend";
    container.call(this);
};
util.inherits(ContainerFriend, container);
/**
 * Expose constructor.
 */
module.exports = ContainerFriend;

ContainerFriend.prototype.add = function(obj) {
    return this.m_Array.push(obj);
}

ContainerFriend.prototype.del = function(guid) {
    //return this.del(guid);
}
ContainerFriend.prototype.fromDb = function(reply) {
    for(var k in reply){
        var _db = reply[k];
        var _friend = new ObjFriend();
        _friend.fromDB(JSON.parse(_db));

        this.add(_friend);
    }
}