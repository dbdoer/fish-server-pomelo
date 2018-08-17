/**
 * item
 */

var util = require('util');
var Obj = require('./obj');
var userJson = require('./json/item.json');


var ObjItem = function () {
    Obj.call(this);

    this.name = "item";
    this.data.initTemplate(userJson);
};
util.inherits(ObjItem, Obj);


/**
 * Expose 'ObjItem' constructor.
 */
module.exports = ObjItem;