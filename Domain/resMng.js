/*!
 * node-server -- resource table manager
 * 关于
 * json (程序员定义动态数据结构，用于存档数据)
 * table (策划填写静态数据结构, excel 导出)
 * 资源数据的读取都必须走此接口
 */

module.exports = {
    //程序员自定义需要存档的动态数据
    getJson : function(name) {
        return require('../json/' + name + '.json');
    },

    //策划填写表生成的静态数据
    getTable : function(name) {
        return require('../Resources/' + name + '.json');
    }
};




