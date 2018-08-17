"use strict";
//
var cp = require('child_process');
var express = require('express');
var os = require('os');
var fs = require("fs");
var cpList = {};

var batch_test_robot_list =require('./client-user.json');

function cloneClient(idx) {
    console.log("clone idx[%d]=",idx, batch_test_robot_list[idx]);
    var path = "./FrontServer/client.js";
    var c = cp.fork(path, [JSON.stringify({
        uid: batch_test_robot_list[idx]
    })]);
    c.on("exit", function () {
        delete cpList[idx];
    });
    cpList[idx] = {
        "cp": c
    };
}


function start_one(idx) {
    if(idx){
        cloneClient(idx);
        return;
    }

    for(var k=batch_test_robot_list.length-1;k>=0; k--){
        cloneClient(k);
    }
}

function start_all(num) {
    for(var k=batch_test_robot_list.length-1;k>=0; k--){
        cloneClient(k);
    }
}

function start_area(b, e) {
    for(var k=b;k<e; k++){
        cloneClient(k);
    }
}


start_area(0,100);