/*!
 * node-server --  event of obj attr change
 * Copyright(c) 2016 jason.bin <23692515@qq.com>
 */
module.exports = DataEvent;

var DataEvent = function() {
    this.m_events = {};
};

/**
 * 注册事件
 */
DataEvent.prototype.register = function(key, event) {
    if(!this.m_events[key]){
        this.m_events[key] = [];
    }

    this.m_events[key].push(event);
};

/**
 * 触发事件
 */
DataEvent.prototype.fire = function(key, value, oldvalue) {
    var list = this.m_events[key];
    if(!list){
        return;
    }

    for(var i=0; i<list.length; i++){
        list[i](value, oldvalue);
    }
};
