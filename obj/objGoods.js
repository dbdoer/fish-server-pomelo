/**
 * item
 */

var util = require('util');
var Obj = require('./obj');
var userJson = require('./json/goods.json');


var ObjGoods = function () {
    Obj.call(this);

    this.name = "goods";
    this.data.initTemplate(userJson);
};
util.inherits(ObjGoods, Obj);


/**
 * Expose 'ObjItem' constructor.
 */
module.exports = ObjGoods;