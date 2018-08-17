/*!
 * node-server --  data io
 * Copyright(c) 2016 jason.bin <23692515@qq.com>
 */

var util = require('util');
var Data = require('./data');

var DataIO = function () {
    Data.call(this);
};


util.inherits(DataIO, Data);
module.exports = DataIO;

/**
 *  组织需要写入到DB中的int 和 str value值
 *
 * @api public
 */
DataIO.prototype.getKeys = function () {
    var info = [];
    var self = this;
    for(var k in self){
        info.push(k);
    }
    return info;
};

/**
 * 读档
 * 这里兼容版本升级，只复制版本需要的内容
 * @param obj
 */
DataIO.prototype.fromDB = function (obj) {
    var self = this;
    for(var k in self){
        if (typeof(self[k]) == "function"){
            continue;
        }

        if(obj[k]){
            self[k] = obj[k];
        }
    }
}

/**
 *得到用户信息
 * @param obj
 */
DataIO.prototype.getData = function () {
    var self = this;
    var info = {};
    for(var k in self){
        if (typeof(self[k]) == "function"){
            continue;
        }

        info[k] = self[k];
    }
    return info;
}


DataIO.prototype.fromData = function (obj) {
    var self = this;
    for(var k in self){
        if (typeof(self[k]) == "function"){
            continue;
        }

        if(obj[k]){
            self[k] = obj[k];
        }
    }
}
