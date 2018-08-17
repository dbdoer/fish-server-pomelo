/**
 * Created by lihao.cheng on 2017/3/22.
 */

//本文件导出
var otherLoginLogic = module.exports;

var COMM = require("../../common/commons");

otherLoginLogic.getPackageInfo = function (user){
    var novicePackage = user.getValue("novicePackage");

    var _novicePackage = JSON.parse(novicePackage);

    var arrNovicePackage = [];
    if(_novicePackage.getShouchongPackage1==undefined){
        _novicePackage.getShouchongPackage1 = 0;
    }
    if(_novicePackage.getShouchongPackage2==undefined){
        _novicePackage.getShouchongPackage2 = 0;
    }
    if(_novicePackage.getShouchongPackage3==undefined){
        _novicePackage.getShouchongPackage3 = 0;
    }
    if(_novicePackage.getShouchongPackage4==undefined){
        _novicePackage.getShouchongPackage4 = 0;
    }

    user.setValue("novicePackage",JSON.stringify(_novicePackage));
    arrNovicePackage[0] = _novicePackage.getShouchongPackage1*1;
    arrNovicePackage[1] = _novicePackage.getShouchongPackage2*1;
    arrNovicePackage[2] = _novicePackage.getShouchongPackage3*1;
    arrNovicePackage[3] = _novicePackage.getShouchongPackage4*1;

    var getOtherPackage1 = user.getValue("getOtherPackage1")*1;
    var getOtherPackage2 = user.getValue("getOtherPackage2")*1;
    var getOtherPackage3 = user.getValue("getOtherPackage3")*1;
    var getOtherPackage4 = user.getValue("getOtherPackage4")*1;
    var timePackage1 = user.getValue("timePackage1")*1;
    var timePackage2 = user.getValue("timePackage2")*1;
    var timePackage3 = user.getValue("timePackage3")*1;
    var timePackage4 = user.getValue("timePackage4")*1;

    if(!COMM.isSameDate(new Date( timePackage1), new Date())){
        getOtherPackage1 = 0;
        user.setValue("getOtherPackage1",getOtherPackage1);
    }
    if(!COMM.isSameDate(new Date(timePackage2), new Date())){
        getOtherPackage2 = 0;
        user.setValue("getOtherPackage2",getOtherPackage2);
    }
    if(!COMM.isSameDate(new Date(timePackage3), new Date())){
        getOtherPackage3 = 0;
        user.setValue("getOtherPackage3",getOtherPackage3);
    }
    if(!COMM.isSameDate(new Date(timePackage4), new Date())){
        getOtherPackage4 = 0;
        user.setValue("getOtherPackage4",getOtherPackage4);
    }
    return {arrNovicePackage:arrNovicePackage,otherPackage:[getOtherPackage1,getOtherPackage2,getOtherPackage3,getOtherPackage4]}
};