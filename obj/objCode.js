/**
 * item
 */

var util = require('util');
var Obj = require('./obj');
var codeJson = require('./json/code.json');


var ObjCode = function () {
    Obj.call(this);

    this.name = "code";
    this.data.initTemplate(codeJson);
};
util.inherits(ObjCode, Obj);


/**
 * Expose 'ObjCode' constructor.
 */
module.exports = ObjCode;