/**
 * mail container
 */
var util = require('util');
var container = require('./containerBase');
var ObjMail = require('../objMail');
/**
 * container
 */
var   ContainerMail = function() {
    this.__type = "ContainerMail";
    container.call(this);
};
util.inherits(ContainerMail, container);
/**
 * Expose constructor.
 */
module.exports = ContainerMail;

ContainerMail.prototype.add = function(obj) {
    return this.m_Array.push(obj);
}

ContainerMail.prototype.del = function(guid) {
    return this.remove(guid);
}

ContainerMail.prototype.fromDb = function(reply) {
    for(var k in reply){
        var _db = reply[k];
        var _item = new ObjMail();
        _item.fromDB(JSON.parse(_db));

        this.add(_item);
    }
}
