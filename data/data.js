/*!
 * node-server --  grid
 * Copyright(c) 2016 jason.bin <23692515@qq.com>
 */
var _ = require('underscore');
var util = require('util');

var Data = function () {
}

module.exports = Data;

//init
Data.prototype.initTemplate = function (json) {
    var self = this;
    for(var k in json){
        self[k] = json[k];
    }
}
/**
 * 设置属性值
 * @param key
 * @param value
 * @returns {boolean}
 */
Data.prototype.set = function (key, value) {
    var self = this;
    if(!self[key]){
        //Log.error('set '+ key + 'error =  ' + value);
        return false;
    }
    if(typeof self[key] != typeof value){
        //Log.error('typeof  '+ key + '   error ' + value);
        return false;
    }
    self[key] = value;
    return true;
};

/**
 * 得到指定属性
 * @param key
 */
Data.prototype.get = function (key) {
    var self = this;
    if(!self[key]){
        //Log.error('get '+ key + ' undefined ');
        return null;
    }
    return self[key];
};

/**
 * 数据克隆
 */
Data.prototype.clone = function () {
    var self = this;
    var ret = {};
    for(var k in self){
        ret[k] = self[k];
    }
    return ret;
};


/**
 * 两个对象数据差集
 * 两个数据结构之间差异数据
 */
Data.prototype.getDiffData = function (data) {
    var self = this;
    var ret = {};
    for(var k in data){
        if(!(k  in self)){
            ret[k] = data[k];
        }
    }

    return ret;
};