"use strict";
/**
 * 机器人处理
 */

var redisCmd = require("../database/redis").getCluster();
var resSkillInfo = require("../Resources/skill");
var _ = require("underscore");
var REDIS_KEY_ROBOTS_INFO = "fish4robots";

//随机名字
var name_array = require("../Resources/nickname.json").nickname;
var COMM = require("../common/commons");


function initRobot(num) {
    var robots = [];
    var randomName = function(){
        var len = name_array.length;
        var r1 = COMM.INRANGE_RANDOM(0,len);
        var r2 = COMM.INRANGE_RANDOM(0,len);
        return name_array[r1]["name1"] + name_array[r2]["name2"];
    }

    //随机头像
    var randomImage = function(){
        return  COMM.INRANGE_RANDOM(1,5);
    }

    function addRobot(info) {
        robots.push(info);
        redisCmd.hset(REDIS_KEY_ROBOTS_INFO, info.uid, JSON.stringify(info), function(err, ret){
            if(err){
                console.log("err == %s", err);
            }
            console.log("add robot to redis  == %s", ret);
        });
    }

    var userSkill = {};
    for (var i in resSkillInfo) {
        userSkill[i] = resSkillInfo[i].cost;
    }

    for(var i=0; i<num; i++){
        addRobot({
            uid: "robot_" + i,
                channel: "100000",
                headImage:randomImage(),
                outsideUuid: i,
                nickname: ""+ randomName(),
                password: "guest",
                gold: 999999,
                gem: 10,
                coupon: 0,
                skills: JSON.stringify(userSkill)
        },function(){});
    }

    return robots;
}

function init(num) {
    redisCmd.hvals(REDIS_KEY_ROBOTS_INFO,function (err, reply) {
        if(err){
            return;
        }

        if(!_.isArray(reply)){
            return;
        }
        if(reply.length == 0){
            global.__robotsList = initRobot(num);
        }
    })
}

function getRobots(cb) {
    if(global.__robotsList){
        cb(global.__robotsList)
        return;
    }

    redisCmd.hvals(REDIS_KEY_ROBOTS_INFO, function (err, ret) {
        if(err){
            return;
        }

        var list = [];
        for(var i=0; i<ret.length; i++){
            list[i] = JSON.parse(ret[i]);
        }

        global.__robotsList = list;
        cb(list);
    });
}

module.exports = {
    init: init
    ,getRobots: getRobots
};