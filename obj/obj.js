/**
 * Module dependencies
 * Copyright(c) 2016 jason.bin <23692515@qq.com>
 */

var data = require('../data/dataIo');
var Obj = function () {
    this.name       = null;
    this.data       = new data();
};

module.exports = Obj;

Obj.prototype.fromDB = function(data) {
    return this.data.fromDB(data);
}

Obj.prototype.getKeys = function () {
    return this.data.getKeys();
}

Obj.prototype.getData = function() {
    return this.data.getData();
}

/// 好友专用
Obj.prototype.getGuid = function(key) {
    var data = this.data;
    if(!data.hasOwnProperty(key)){
       
        return data['guid'];
    }else{
        return "InvalidGuid";
    }
}

/// 礼物专用
Obj.prototype.getGiftTime = function(key) {
    var data = this.data;
    if(!data.hasOwnProperty(key)){

        return data['time'];
    }else{
        return "InvalidTime";
    }
}

/// 道具专用
Obj.prototype.getPropID = function(key) {
    var data = this.data;
    if(!data.hasOwnProperty(key)){

        return data['propID'];
    }else{
        return "InvalidPropId";
    }
}

Obj.prototype.getId = function(key) {
    var data = this.data;
    if(!data.hasOwnProperty(key)){
       
        return data['id'];
    }else{
        return "InvalidId";
    }
}
Obj.prototype.getValue = function(key) {
    var data = this.data;
    if(!data.hasOwnProperty(key)){
        //console.log("----- error key no exist -----"+ key);
        return null;
    }

    return data[key];
}

Obj.prototype.setValue = function(key, value) {
    var data = this.data;
    //console.log("----- error key no exist -----",data);
    if(!data.hasOwnProperty(key)){
        //console.log("----- error key no exist -----"+ key);
        return false;
    }

    data[key] = value;
    return true;
}


/**
 * 对象转为string 保存数据
 */
Obj.prototype.setObjToString = function(key, value) {
    var data = this.data;
    if(!data.hasOwnProperty(key)){
        return false;
    }

    data[key] = JSON.stringify(value);
    return true;
}

/**
 * 返回对象
 */
Obj.prototype.getObjByString = function(key) {
    var data = this.data;
    if(!data.hasOwnProperty(key)){
        return null;
    }
    var v = data[key];

    if(v){
        return JSON.parse(data[key]);
    }

    return {};
}

