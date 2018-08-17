/**
 * Module dependencies
 * 继承于这个文件的管理器作删除时一定需要注意
 * 这里的obj是由工作创建和回收
 */
var util = require('util');
/**
 * container
 * 
 */
var ContainerBase = function() {
    this.__type = "ContainerBase";
    this.m_Array = null;
};

/**
 * Expose constructor.
 *
 */
module.exports = ContainerBase;

/**
 * init cont manager
 * @api public
 */
ContainerBase.prototype.init = function(ct) {
   this.m_Array = ct;
};

/**
 * 清空
 * 容器中所有物品有factory创建
 * 容器中所有物品有factory回收
 */
ContainerBase.prototype.release = function() {
    this.m_Array = null;
};

/**
 * 容器中添加obj
 */
ContainerBase.prototype.push = function(obj) {
    if(!this.m_Array){
        return false;
    }

    this.m_Array.push(obj);
    return true;
}

/**
 * 得到指定容器中的物品
 */
ContainerBase.prototype.set = function(idx, obj) {
    if(!this.m_Array){
        return false;
    }
    //obj 不允许覆盖
    if(this.m_Array[idx]){
        var tmpObj = this.m_Array[idx];
        this.m_Array[idx] = obj;
        return tmpObj;
    }
    this.m_Array[idx] = obj;
    return true;
}

/**
 * 快速删除
 * 容器中删除obj,删除位置
 */
ContainerBase.prototype.dropByIndexArr = function(indexArr) {
    var _array = this.m_Array;
    if(!_array) {
        return false;
    }
    if(!util.isArray(indexArr)) {
        return false;
    }
    indexArr.sort(function(a, b){
        return b - a;
    });
    for(var i = 0, l = indexArr.length; i < l; i++) {
        if(indexArr[i] < 0 || indexArr[i] >= _array.length) {
            return false;
        }
        var _obj = _array[indexArr[i]];
        _array.splice(indexArr[i],1);
        if(_obj) {
            //pomelo.app.get('FactoryMng').delete(_obj);
            _obj = null;
        }
    }
    return true;
};

/**
 * 容器中删除obj,删除位置
 */
ContainerBase.prototype.drop = function(guid) {
    var _array = this.m_Array;
    if(!_array){
        return false;
    }

    var _obj = null;
    for(var i=0 ;i<_array.length; i++){
        if(!_array[i]){
            continue;
        }

        if(_array[i].getGuid() == guid){
            _obj = _array[i];
            _array.splice(i,1);
            break;
        }
    }

    if(!_obj){
        return false;
    }
    return true;
    //return pomelo.app.get('FactoryMng').delete(_obj);
}

/**
 * 容器中删除obj,删除位置
 */
ContainerBase.prototype.dropIndex = function(index ,guid) {
    var _array = this.m_Array;
    if(!_array){
        return false;
    }

    var _obj = null;

    if(_array[index].getGuid() == guid){
        _obj = _array[index];
        _array.splice(index,1);
    }

    if(!_obj){
        return false;
    }
    return true;
    //return pomelo.app.get('FactoryMng').delete(_obj);
}
/**
 * 容器中删除obj,保留位置
 */
ContainerBase.prototype.erase = function(guid) {
    var _array = this.m_Array;
    if(!_array){
        return false;
    }

    var _obj = null;
    for(var i=0 ;i<_array.length; i++){
        if(!_array[i]){
            continue;
        }

        if(_array[i].getGuid() == guid){
            _obj = _array[i];
            _array[i] = null;
            break;
        }
    }

    if(!_obj){
        return false;
    }

    return true;
    //return pomelo.app.get('FactoryMng').delete(_obj);
}

/**
 * 容器中删除obj,保留位置
 */
ContainerBase.prototype.erase_All = function() {
    var _array = this.m_Array;
    if(!_array){
        return false;
    }

    var _obj = null;
    for(var i=0 ;i<_array.length; i++){
        if(!_array[i]){
            continue;
        }

        _obj = _array[i];
        _array[i] = null;
        //pomelo.app.get('FactoryMng').delete(_obj);
    }
};

/**
 *obj 移走到其它容器不删除
 */
ContainerBase.prototype.remove = function(guid) {
    var _array = this.m_Array;
    if(!_array){
        return false;
    }

    //var _obj = null;
    var _delIndex = -1;
    for(var i=0 ;i<_array.length; i++){
        if(!_array[i]){
            continue;
        }

        if(_array[i].getGuid() == guid){
            //_obj = _array[i];
            //_array[i] = null;
            _delIndex = i;
            break;
        }
    }

    //if(!_obj){
    //    return false;
    //}

    if(_delIndex != -1){
        if(_array[_delIndex] && _array[_delIndex].getGuid() == guid){
            _array[_delIndex] = null;
            _array.splice(_delIndex,1);
            return true;
        }
    }

    return false;
};


ContainerBase.prototype.getByGuid = function(guid) {

    var _array = this.m_Array;
    if(!_array){
        return null;
    }

    var _obj = null;
    for(var i=0; i<_array.length; i++){
        if(!_array[i]){
            continue;
        }

        if(_array[i].getGuid() == guid){
            _obj = _array[i];
            break;
        }
    }

    return _obj;
}

ContainerBase.prototype.getRealByGuid = function(guid) {

    var _array = this.m_Array;
    if(!_array){
        return null;
    }

    for(var i=0; i<_array.length; i++){
        if(!_array[i]){
            continue;
        }

        if(_array[i].getPropID() == guid){
            return _array[i];
        }
    }
    return null;
}

ContainerBase.prototype.getByType = function(type) {

    var _array = this.m_Array;
    if(!_array){
        return null;
    }

    var _obj = null;
    if(_array[0]){
        if(_array[0].getAttrInt("HeroType") == type){
            _obj = _array[0];
        }
    }
    return _obj;
}

ContainerBase.prototype.getByModelID = function(ModelID) {

    var _array = this.m_Array;
    if(!_array){
        return null;
    }

    var _obj = null;
    if(_array[0]){
        if(_array[0].getAttrInt("ModelID") == ModelID){
            _obj = _array[0];
        }
    }
    return _obj;
}

ContainerBase.prototype.getByIdx = function(idx) {
    var _array = this.m_Array;
    if(!_array){
        return null;
    }

    if(idx>_array.length || idx < 0){
        return null;
    }

    return _array[idx];
}


ContainerBase.prototype.get = function(key) {
    if ('number' === typeof key) {
        return this.getByIdx(key);
    }

    if ('string' === typeof key) {
        return this.getByGuid(key);
    }

    return null;
}

ContainerBase.prototype.isIn = function(guid) {
    var _array = this.m_Array;
    if(!_array){
        return false;
    }

    for(var i=0; i<_array.length; i++){

        var _obj = _array[i];
        if(!_obj){
            continue;
        }

        if(_obj.getGuid() == guid){
            return true;
        }
    }

    return false;
}
/// 好友专用
ContainerBase.prototype.writeDataToDb = function() {
    var _array = this.m_Array;
    var ret = {};
    for(var i=0; i<_array.length; i++){
        var _obj = _array[i];
        if(!_obj){
            continue;
        }
        ret[_obj.getGuid()] = JSON.stringify(_obj.getData());
    }

    return ret;
}

/// 礼物专用
ContainerBase.prototype.writeDataToRedis = function() {
    var _array = this.m_Array;
    var ret = {};
    for(var i=0; i<_array.length; i++){
        var _obj = _array[i];
        if(!_obj){
            continue;
        }
        console.log("-------------_obj",_obj);
        ret[_obj.getGiftTime()] = JSON.stringify(_obj.getData());
    }

    return ret;
}

/// 道具专用
ContainerBase.prototype.writeDataToDbByPropId = function() {
    var _array = this.m_Array;
    var ret = {};
    for(var i=0; i<_array.length; i++){
        var _obj = _array[i];
        if(!_obj){
            continue;
        }
        ret[_obj.getPropID()] = JSON.stringify(_obj.getData());
    }

    return ret;
}

ContainerBase.prototype.writeDataToDbByUid = function() {
    var _array = this.m_Array;
    var ret = {};
    for(var i=0; i<_array.length; i++){
        var _obj = _array[i];
        if(!_obj){
            continue;
        }
        ret[_obj.getId()] = JSON.stringify(_obj.getData());
    }

    return ret;
}
