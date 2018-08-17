exports.CS_Fire_encode = function (clientid, fireX, fireY) {
    var buffer = new Buffer(6);
    var offset = 0;
    buffer.writeUInt16BE(clientid, offset);
    offset += 2;
    buffer.writeUInt16BE(fireX, offset);
    offset += 2;
    buffer.writeUInt16BE(fireY, offset);
    offset += 2;
    return buffer;
}

exports.CS_Fire_decode = function (buffer) {
    var readoffset = 0;
    var clientid = buffer.readUInt16BE(readoffset);
    readoffset += 2;
    var fireX = buffer.readUInt16BE(readoffset);
    readoffset += 2;
    var fireY = buffer.readUInt16BE(readoffset);
    readoffset += 2;
    return {clientid: clientid, fireX: fireX, fireY: fireY}
}

exports.CS_ExplosionInfo_encode = function (fireid, fishids) {
    var len = 4 + 2 + 4 * fishids.length;
    var buffer = new Buffer(len);
    var offset = 0;
    buffer.writeUInt32BE(fireid, offset);
    offset += 4;
    buffer.writeUInt16BE(fishids.length, offset);
    offset += 2;
    for (var i = 0; i < fishids.length; i++) {
        buffer.writeUInt32BE(fishids[i], offset);
        offset += 4;
    }
    return buffer;
}

exports.CS_ExplosionInfo_decode = function (buffer) {
    var readoffset = 0;
    var fireid = buffer.readUInt32BE(readoffset);
    readoffset += 4;
    var len = buffer.readUInt16BE(readoffset);
    readoffset += 2;
    var fishids = [];
    for (var i = 0; i < len; i++) {
        var fishid = buffer.readUInt32BE(readoffset);
        fishids.push(fishid);
        readoffset += 4;
    }

    var fullCapture = buffer.readUInt8(readoffset);
    readoffset += 1;
    if(fullCapture == undefined){
        fullCapture = false;
    }
    var bombValue = buffer.readUInt32BE(readoffset);
    readoffset += 4;
    if(bombValue == undefined){
        bombValue = 0;
    }
    return {fireid: fireid, fishid: fishids, isFullCapture: fullCapture, bombValue:bombValue}
}

exports.SC_Fire_encode = function (clientid, fireid, canfire) {
    var datalen = 2 + 4 + 1;
    var buffer = new Buffer(datalen);
    var offset = 0;
    buffer.writeUInt16BE(clientid, offset);
    offset += 2;
    buffer.writeUInt32BE(fireid, offset);
    offset += 4;
    if (canfire) {
        buffer.writeUInt8(1, offset);
        offset += 1;
    } else {
        buffer.writeUInt8(0, offset);
        offset += 1;
    }
    return buffer;
}

exports.SC_Fire_decode = function (buffer) {
    var readoffset = 0;
    var clientid = buffer.readUInt16BE(readoffset);
    readoffset += 2;
    var fireid = buffer.readUInt32BE(readoffset);
    readoffset += 4;
    var canfire = buffer.readUInt8(readoffset);
    return {clientid: clientid, fireId: fireid, canfire: canfire}
}

exports.SC_BroadcastFire_encode = function (pos, fireX, fireY) {
    var datalen = 1 + 2 + 2;
    var buffer = new Buffer(datalen);
    var offset = 0;
    buffer.writeUInt8(pos, offset);
    offset += 1;
    buffer.writeUInt16BE(fireX, offset);
    offset += 2;
    buffer.writeUInt16BE(fireY, offset);
    offset += 2;
    return buffer;
}

exports.SC_ExplosionInfo_encode = function (fishids) {
    var datalen = 2 + 4 * fishids.length;
    var buffer = new Buffer(datalen);
    var offset = 0;
    buffer.writeUInt16BE(fishids.length, offset);
    offset += 2;
    for (var i = 0; i < fishids.length; i++) {
        buffer.writeUInt32BE(fishids[i], offset);
        offset += 4;
    }
    return buffer;
}

exports.SC_ExplosionInfo_decode = function (buffer) {
    var readoffset = 0;
    var fishids = [];
    var len = buffer.readUInt16BE(readoffset);
    readoffset += 2;
    for (var i = 0; i < len; i++) {
        var fishid = buffer.readUInt32BE(readoffset);
        fishids.push(fishid);
        readoffset += 4;
    }
    return {fishids: fishids};
}

exports.SC_BroadcastExplosionInfo_encode = function (pos, fishids, fullCatch) {
    var datalen = 1 + 2 + 8 * fishids.length + 1;
    var buffer = new Buffer(datalen);
    var offset = 0;
    buffer.writeUInt8(pos, offset);
    offset += 1;
    buffer.writeUInt16BE(fishids.length, offset);
    offset += 2;
    for (var i = 0; i < fishids.length; i++) {
        buffer.writeUInt32BE(fishids[i].fishId, offset);
        offset += 4;
        buffer.writeUInt32BE(fishids[i].gold, offset);
        offset += 4;
    }

    /// fullCatch == 2超神模式
    if(fullCatch == undefined || fullCatch == 2){
        fullCatch = false;
    }
    buffer.writeUInt8(fullCatch, offset);
    offset += 1;
    return buffer;
}

exports.SC_BroadcastExplosionInfo_decode = function (buffer) {
    var readoffset = 0;
    var fishids = [];
    var pos = buffer.readUInt8(readoffset);
    readoffset += 1;
    var len = buffer.readUInt16BE(readoffset);
    readoffset += 2;
    for (var i = 0; i < len; i++) {
        var fishid = buffer.readUInt32BE(readoffset);
        fishids.push(fishid);
        readoffset += 4;
    }
    return {pos: pos, fishids: fishids}
}

























