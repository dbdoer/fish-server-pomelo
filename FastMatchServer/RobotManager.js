/**
 * 机器人管理器
 */


var async = require('async');
var COMM = require("../common/commons");
var Robot = require('./Robot');
var robotDao = require('../dao/robotDao');

module.exports = RobotManager;

/**
 * 创建match的规则 只要对应的比赛被消费掉就立刻创建新的 但是首次创建需要由用户报名触发
 * */
function RobotManager(match) {
    this.match = match;
    this.robots = {};
}

RobotManager.prototype.init = function (num) {
    var self = this;
    robotDao.getRobots(function(array){

        self.total = num;
        var playerMng = self.match.matchManager.playManager;
        function enter(uid, robot){
            playerMng.addPlayer(uid, -1, function (err, player) {
                player.setRobotFlag();
                robot.bindPlayer(player);
                self.match.signUp(player);
                player.join(self.match.matchId, robot.data, function(err, ret){
                    if(err){
                        console.log('error robot join err=%s', err);
                    }
                });
            });
        }


        array.sort(function(){ return 0.5 - Math.random() });

        for(var i =0; i<num; i++){
            var r = new Robot();
            r.clone(array[i]);
            self.robots[r.getUid()]  = r;
            enter(r.getUid(), r);
        }
    });
}


//随机开火
RobotManager.prototype.autoFire = function () {
    var list = this.robots;
    for(var k in list){
        var robot = list[k];
        //三分之一的概率开炮
        //if(robot && !COMM.INRANGE_RANDOM(0,num)){
        if(true){
            robot.aiFire(400+COMM.INRANGE_RANDOM(-100, 220),
                    230+COMM.INRANGE_RANDOM(-100, 220));
        }
    }
}

//ai 开始
RobotManager.prototype.startAI = function () {
    var self = this;
    this.timerFire = setInterval(function () {
        self.autoFire();
    }, 300);
}

//ai 关闭
RobotManager.prototype.stopAI = function () {
    var self =  this;
    if(self.timerFire){
        clearInterval(self.timerFire);
    }

}