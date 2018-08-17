/**
 * robot
 */
var COMM = require("../common/commons");
//随机名字
module.exports = Robot;

function Robot(idx) {

}

Robot.prototype.autoFire = function () {
}

Robot.prototype.clone = function (obj) {
 this.data  = obj;
}


Robot.prototype.getUid = function () {
    if(this.data){
        return this.data['uid'];
    }

    return null;
}


Robot.prototype.bindPlayer = function (player) {
    var self = this;
    self.player = player;
}

Robot.prototype.randomWeapon = function () {
}



Robot.prototype.aiFire = function (x, y) {
    var player = this.player;
    if(player){
        player.fire(x ,y,function(){   });
    }
}


//rpc.getMethod('msgPacketTrans')('fire', arrRobot[i], [400, 230], function (err, fireCount) {
//    if (fireCount == undefined || fireCount == null) {
//        fireCount = 0;
//    }
//});
