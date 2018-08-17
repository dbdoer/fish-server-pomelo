/**
 * mail
 */

var util = require('util');
var Obj = require('./obj');
var templatejson = require('./json/mail.json');
var uuid = require("uuid");
var md5 = require('../common/md5');

var ObjMail = function () {
    Obj.call(this);

    this.name = "mail";
    this.data.initTemplate(templatejson);

    this.setValue("id", uuid.v1());  /// 邮件唯一ID
    this.setValue("createTime", Math.floor(Date.now()/1000));  /// 创建的时间
};



util.inherits(ObjMail, Obj);


/**
 * Expose 'ObjMail' constructor.
 */
module.exports = ObjMail;