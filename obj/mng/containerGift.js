/**
 * Module dependencies
 * 操作的数组--礼物
 */
var util = require('util');
var container = require('./containerBase');
var ObjItem = require('../objItem');
/**
 * container
 */
var ContainerGift = function() {
    this.__type = "ContainerGift";
    container.call(this);

};
util.inherits(ContainerGift, container);
/**
 * Expose constructor.
 */
module.exports = ContainerGift;



ContainerGift.prototype.add = function(obj) {
    return this.m_Array.push(obj);
}


ContainerGift.prototype.del = function(uid) {
    return this.erase(uid);
}


ContainerGift.prototype.fromDb = function(reply) {
    for(var k in reply){
        var _db = reply[k];
        var _item = new ObjItem();
        _item.fromDB(JSON.parse(_db));

        this.add(_item);
    }
}