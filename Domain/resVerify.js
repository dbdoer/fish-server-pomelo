/*!
 * 资源数据校验
 */
var fs = require('fs');
var CONST = require('../common/consts');
var commons = require('../common/commons');
var md5 = require('../util/md5');
var ResMng = require('./resMng');
var OBJ_TYPE = CONST.OBJ_TYPE;



module.exports = {
    //json
    getMd5Json : function() {
        //var json_md5_array = [];
        var str = "";
        for(var k in OBJ_TYPE){
            var json = ResMng.getJson(OBJ_TYPE[k]);
            //json_md5_array.push(md5.md5(json));
            str += md5.md5(JSON.stringify(json));
        }

        return md5.md5(str);
    },



    getMd5Table : function() {
        //var json_md5_array = [];
        var str = "";
        for(var k in OBJ_TYPE){
            var json = ResMng.getJson(OBJ_TYPE[k]);
            //json_md5_array.push(md5.md5(json));
            str += md5.md5(json);
        }

        return md5.md5(str);
    },

    getFile: function(){
        var list = [];
        fs.readdirSync('../../table/').forEach(function (filename) {
            if (!/\.js$/.test(filename)) {
                return;
            }
            var name = path.basename(filename, '.js');
            var file = require('./components/' + name);  //寻找components下的js文件，并通过require加载到源码中
            list.push(file);
        });
    }


};





