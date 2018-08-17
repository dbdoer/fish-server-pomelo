/**
 * mail container
 */
var util = require('util');
var container = require('./containerBase');
var ObjGoods = require('../objGoods');
/**
 * container
 */
var   ContainerGoods = function() {
    this.__type = "ContainerGoods";
    container.call(this);
};
util.inherits(ContainerGoods, container);
/**
 * Expose constructor.
 */
module.exports = ContainerGoods;

ContainerGoods.prototype.add = function(obj) {
    return this.m_Array.push(obj);
}

ContainerGoods.prototype.del = function(guid) {
    return this.remove(guid);
}

ContainerGoods.prototype.fromDb = function(reply) {
    for(var k in reply){
        var _db = reply[k];
        var _item = new ObjGoods();
        _item.fromDB(JSON.parse(_db));

        this.add(_item);
    }
}
