/**
 * mail container
 */
var util = require('util');
var container = require('./containerBase');
var ObjCode = require('../../obj/objCode');
/**
 * container
 */
var   containerCode = function() {
    this.__type = "containerCode";
    container.call(this);
};
util.inherits(containerCode, container);
/**
 * Expose constructor.
 */
module.exports = containerCode;

containerCode.prototype.add = function(obj) {
    return this.m_Array.push(obj);
}

containerCode.prototype.del = function(guid) {
    return this.remove(guid);
}

containerCode.prototype.fromDb = function(reply) {
    for(var k in reply){
        var _db = reply[k];
        var _item = new ObjCode();
        _item.fromDB(JSON.parse(_db));

        this.add(_item);
    }
}
