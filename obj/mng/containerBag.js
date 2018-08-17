  /**
 * Module dependencies
 * 操作的数组--背包
 */
var util = require('util');
var container = require('./containerBase');
var ObjItem = require('../objItem');
/**
 * container
 */
var ContainerBag = function() {
    this.__type = "ContainerBag";
    container.call(this);

};
util.inherits(ContainerBag, container);
/**
 * Expose constructor.
 */
module.exports = ContainerBag;



ContainerBag.prototype.add = function(obj) {
  return this.m_Array.push(obj);
}


ContainerBag.prototype.del = function(guid) {
  return this.erase(guid);
}
  

ContainerBag.prototype.delFromTab = function(index ,guid) {
      return this.dropIndex(index ,guid);
};
ContainerBag.prototype.getbyGuid = function(guid) {
      return this.getByGuid(guid);
};

ContainerBag.prototype.getRealbyGuid = function(guid) {

      return this.getRealByGuid(guid);
}

ContainerBag.prototype.getItemByType = function(type) {

  var _array = this.m_Array;
  if(!_array){
      return null;
  }

  var _objlist = [];
  for(var i=0; i<_array.length; i++){
      if(!_array[i]){
          continue;
      }
      if(_array[i].getAttrInt("ItemType") != CT_ITEM_TYPE.GEM){
          continue;
      }
      if(_array[i].getAttrInt("GemType") == type){
          var _obj = _array[i];
          _objlist.push(_obj);
          continue;
      }
  }

  return _objlist;
};

ContainerBag.prototype.fromDb = function(reply) {
    for(var k in reply){
        var _db = reply[k];
        var _item = new ObjItem();
        _item.fromDB(JSON.parse(_db));

        this.add(_item);
    }
}