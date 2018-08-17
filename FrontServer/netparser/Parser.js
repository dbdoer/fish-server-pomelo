var fs = require('fs');
var Schema = require('protobuf').Schema;
//var log = require('../../log/log').logger("normal");
//gameserver服务器协议
var schema = new Schema(fs.readFileSync('./FrontServer/netparser/field-options.desc'));
//var schema = new Schema(fs.readFileSync(__dirname + '/field-options.desc'));
var schema_log = new Schema(fs.readFileSync('./FrontServer/netparser/field-options.desc'));
var before = "mi.";
exports.encode = function (packetname, json) {
    //buffer will *only* contain the protobuf encoded message, *NOT* the full riak packet
    try {
        var Feed = schema[before + packetname];
        var buffer = Feed.serialize(json);


        //console.log(JSON.stringify(json));
        return buffer;
    } catch (e) {
        //log.info(e.stack);
        //log.info("encode error:" + packetname);
        return null;
    }
};

exports.decode = function (packetname, buffer) {
    //again, this will *only* decode the protobuf message. you have to remove the riak header yourself
    //console.log("Parser.js-decode:packetname:"+packetname);
    try {
        var Feed = schema[before + packetname];
        var json = Feed.parse(buffer);
        return json;
    } catch (e) {
        //log.info(e.stack);
        //log.info("decode error:" + packetname);
        return null;
    }


};

exports.encode_log = function (packetname, json) {
    var Feed = schema_log[before + packetname];
    var buffer = Feed.serialize(json);
    return buffer;
};

exports.decode_log = function (packetname, buffer) {
    var Feed = schema_log[before + packetname];
    var json = Feed.parse(buffer);
    return json;
};

























