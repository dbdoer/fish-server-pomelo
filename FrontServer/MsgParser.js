/**
 * Created by ck01-441 on 2016/2/25.
 * 对socket前端收到的消息进行解析
 * 工具类
 */




var binaryMsgId = [207, 209]; //目前只有这两个decode用到了binaryParser
var binaryRespId = {
    //4601: 'SC_UserSkill_encode',
    4207: 'SC_Fire_encode',
    4208: 'SC_BroadcastFire_encode',
    4209: 'SC_ExplosionInfo_encode',
    4210: 'SC_BroadcastExplosionInfo_encode'
};
var binaryParser = require("./netparser/binaryparser.js");
var protoParser = require("./netparser/Parser.js");
var protoDictionary = require("../Resources/msg_dictionary.json").protobuf;
var responseDictionary = require("../Resources/msg_dictionary.json").response;
var getProtoName = function(key){
    return responseDictionary[''+key];
}

/**
 * 识别是否是protobuf协议的消息 根据特定的消息号判断
 * @param packageId 包ID
 * */
function isProtoMsg(packageId) {
    for (var key in binaryMsgId) {
        if (parseInt(packageId) === binaryMsgId[key]) {
            return false;
        }
    }
    return true;
}

//解析protobuf数据包
function decodeProtoData(packageId, packageData) {
    //需要一个对照字典  protoDictionary
    return protoParser.decode(protoDictionary[packageId], packageData);
}

//解析binary数据包
function decodeBinaryData(packageId, packageData) {
    switch (parseInt(packageId)) {
        case 207:
            return binaryParser.CS_Fire_decode(packageData);
        case 209:
            return binaryParser.CS_ExplosionInfo_decode(packageData);
        default:
        //do nothing
    }
}
function buildProtoMsg(pid,pname, msg) {
    var protobufdata;
    var package_name = pname;
    if (binaryRespId[pid*1]) {
        protobufdata = binaryParser[binaryRespId[pid]].apply(null, msg);
    } else {
        if(!package_name){
            package_name = getProtoName(pid);
        }
        protobufdata = protoParser.encode(package_name, msg);
    }

    if (protobufdata == null) {
        return;
    }

    //console.log('pid=%s, name=%s, length=%d', pid, package_name, protobufdata.length);

    var buffer = new Buffer(protobufdata.length + 2 + 4);
    buffer.writeUInt16BE(protobufdata.length + 4, 0);
    buffer.writeUInt32BE(pid, 2);
    protobufdata.copy(buffer, 6);
    return buffer;
}

/**
 * @param packageId 包id
 * @param packageData 包数据
 * @return 解码后的数据
 * */
function parse(packageId, packageData) {
    if (isProtoMsg(packageId)) {
        return decodeProtoData(packageId, packageData);
    } else {
        return decodeBinaryData(packageId, packageData);
    }
};
module.exports = {
    encodeProtoMsg: protoParser.encode,
    buildProtoMsg: buildProtoMsg,
    parse: parse
}