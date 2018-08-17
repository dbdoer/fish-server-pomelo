"use strict";
/**
 * Created by ck01-441 on 2016/3/1.
 * 用于测试
 * 发送消息
 * 接收消息
 */

var net = require("net");
var parser = require("./netparser/Parser.js");
var msg_dictionary = require("./msg_dictionary.json").protobuf;
var config = require("../conf/config").test;
var clientList = [];

var LENGTH_BYTE = 2;
var PACKAGE_ID_BYTE = 4;

function createConnection() {
    var client = net.connect({
        port: config.port,
        host: config.ip
    }, function () {
        //链接建立
    }); //创建一个连接

    client._msgBuffer = null;
    client.on("connect", function () {

    });

    client.on("data", function (data) {
        console.log(data);
        //收到data后进行解包
        if (Buffer.isBuffer(data)) {
            if (client._msgBuffer != null) {
                //先拼接上一次剩余的消息
                data = Buffer.concat([client._msgBuffer, data], client._msgBuffer.length + data.length);
                client._msgBuffer = null;
            }
            while (true) {
                //循环处理剩余消息(每次都处理干净）
                if (data == null || data.length < 2) {
                    //连长度都没有 直接返回
                    client._msgBuffer = data;
                    return;
                }
                var packageLength = data.readUInt16BE(0); //获取了包长度
                if (data.length < packageLength + LENGTH_BYTE) {
                    //半包
                    client._msgBuffer = data;
                    return;
                }
                var packageID = data.readUInt32BE(LENGTH_BYTE); // 获取了包ID

                var packageData = data.slice(LENGTH_BYTE + PACKAGE_ID_BYTE, LENGTH_BYTE + parseInt(packageLength)); //切掉长度+ID的头
                if (data.length > packageLength + LENGTH_BYTE) {
                    //粘包循环处理 直到半包或者处理完毕
                    data = data.slice(LENGTH_BYTE + parseInt(packageLength));
                } else {
                    //半包早在这个判断之前就return了
                    data = null;
                }

                /***
                 * // packetid: 4224 定时同步数据
                 message SC_UploadData
                 {
                     required uint32 goldPool = 1; // 当前奖金池数量
                     required uint32 energy = 2; // 当前玩家能量
                 }
                 * */
                var _data = parser.decode("SC_UploadData", packageData);
                console.log("result = " + JSON.stringify(_data));
            }
        } else {
            //String
        }
    });

    client.on("error", function (err) {

    });

    client.on("close", function (had_err) {
        if (had_err) {
            //有错误
        }
    });

    return client;
}

clientList.push(createConnection());

function sendMsg(package_name, msg) {
    var code = -1;
    for (var k in msg_dictionary) {
        if (package_name == msg_dictionary[k]) {
            code = k;
        }
    }
    if (code < 0)return;
    var data = buildRequestMsg(code, package_name, msg);
    for (var i = 0; i < clientList.length; i++) {
        clientList[i].write(data, function () {
            //写完数据

        });
    }
}

//生成一个protobuf的请求
function buildRequestMsg(code, packageName, msg) {
    var data = parser.encode(packageName, msg);
    var length = data.length + 4; // 4位的包id
    var result = new Buffer(length + 2);
    result.writeUInt16BE(length, 0);
    result.writeUInt32BE(code, 2);
    data.copy(result, 6);
    return result;
}

//解析一个protobuf的响应
function parseResponseMsg(buffer) {

}

//测试 进入房间消息
function enterOnlineRoom() {
    var data = {
        sceneid: 10
    };
    sendMsg("CS_EnterOnlineRoom", data);
}

setTimeout(function () {
    console.log("ready to send msg");
    var i = 0;
    while (i++ < 10000)
        enterOnlineRoom();
}, 2000);