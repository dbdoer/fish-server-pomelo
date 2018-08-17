'use strict';
/**
 * Created by 李峥 on 2016/3/30.
 * 加载存储path信息 并作简单分类
 */

var fs = require('fs');

var PATH_DIR = __dirname + '/path/';
var path = [];//存放所有path
var pathTable = {};//名字对应index 按文件名(无后缀)
var fishMap = {};
var fishDepth = {};
var _ = require('underscore');

var files = fs.readdirSync(PATH_DIR);

var log = function(msg) {
    console.log(msg);
}


for (var i = 0; i < files.length; i++) {
    //无视除.json后缀外的全部文件
    if (typeof(files[i]) != 'string' || !new RegExp('json' + "$").test(files[i]))continue;
    var track = require(PATH_DIR + files[i]).track;

    //log("info>>>>>>>>>>>   "+ track) ;
    //track.screens = track.screens[0];
    //track.waves = track.waves[0];
    var waves = track.waves.wave;
    if(!_.isArray(waves)){
        waves = [waves];
    }
    for (var j = 0; j < waves.length; j++) {
        var p = waves[j].path;

        if(!_.isArray(p)){
            p = [p];
        }


        for (var k = 0; k < p.length; k++) {
            var fishes = [];
            fishes = p[k].fish_id.split('|');
            for (var l = 0; l < fishes.length; l++) {
                fishMap[fishes[l]] = {
                    isDead: false,
                    type: p[k].fish_type,
                    special_type: p[k].fish_special_type,
                    trackId: track.track_id,
                    waveid: j,
                    fishId: fishes[l]
                };
                fishDepth[fishes[l]] = {deep: -1};
            }
        }
    }
    pathTable[files[i].split('.')[0]] = path.push(track) - 1;
}

module.exports = {
    getTrackData: function (trackName) {
        return path[pathTable[trackName]];
    },
    getAllTracks: function () {
        return path;
    },
    getFishMap: function () {
        return JSON.parse(JSON.stringify(fishMap));
    },
    getFishDepth: function () {
        return JSON.parse(JSON.stringify(fishDepth))
    }
};