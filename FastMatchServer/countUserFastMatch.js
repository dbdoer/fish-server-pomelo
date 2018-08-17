/**
 * 比赛人数统计
 */

var sortDao = require('../dao/countUserFastMatchDao');

module.exports = {
    SignUp :function (type,isRobot) {
        if(isRobot){
            sortDao.incrRobot(type, function(){});
        }else{
            sortDao.incr(type, function(){});
        }

    },
    UnSign : function (type, isRobot) {
        if(isRobot){
            sortDao.decrRobot(type, function(){});
        }else{
            sortDao.decr(type, function(){});
        }
    },
    CloseRoom : function (type, num, isRobot) {
        if(isRobot){
            if(num >0){
                sortDao.decrbyRobot(type, num, function(){});
            }
        }else{
            if(num >0){
                sortDao.decrby(type, num, function(){});
            }
        }
    }
};
