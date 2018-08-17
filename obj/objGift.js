/**
 * item
 */

var util = require('util');
var Obj = require('./obj');
var Json = require('./json/gift.json');


var ObjGift = function () {
    Obj.call(this);

    this.name = "gift";
    this.data.initTemplate(Json);
};
util.inherits(ObjGift, Obj);


/**
 * Expose 'ObjCode' constructor.
 */
module.exports = ObjGift;