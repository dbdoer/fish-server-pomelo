/**
 * Created by 李峥 on 2016/3/30.
 * 深度管理 保证同屏所有wave都有自己的深度
 * 深度定义
 */

//==================================================================
var MAX_WAVE_IN_SCREEN = 64;
var MAX_WAVE_SIZE = 64;
var MAX_DEPTH_FILED = MAX_WAVE_IN_SCREEN * MAX_WAVE_SIZE;   // 4096
//var BITS_LEN = MAX_WAVE_IN_SCREEN / 8;

module.exports = function () {
    return new DepthManager();
};

function DepthManager() {
    this.bits = new Array(MAX_WAVE_IN_SCREEN);
    for (var i = 0; i < this.bits.length; ++i) {
        this.bits[i] = 0;
    }
    this.grid = parseFloat(MAX_DEPTH_FILED / MAX_WAVE_IN_SCREEN);
}

DepthManager.prototype.getDepth = function () {
    var index = -1;
    var lastIndex = parseInt(Math.random() * MAX_WAVE_IN_SCREEN);
    if (this.bits[lastIndex] == 0) {
        index = lastIndex;
        this.bits[lastIndex] = 1;
    }
    if (index < 0) {
        for (var k = 0; k < MAX_WAVE_IN_SCREEN; k++) {
            if (this.bits[k] == 0) {
                index = k;
                this.bits[k] = 1;
                break;
            }
        }
    }
    if (index < 0) {
        for (var i = 0; i < this.bits.length; ++i) {
            this.bits[i] = 0;
        }
        lastIndex = parseInt(Math.random() * MAX_WAVE_IN_SCREEN);
        if (this.bits[lastIndex] == 0) {
            index = lastIndex;
            this.bits[lastIndex] = 1;
        }
    }

    if (index < 0) {
        log.info("Find Empty Depth!");
        index = 0;
    }
    return this.grid * (index);
};

//将一个深度置空
DepthManager.prototype.recycleDepth = function (depth) {
    this.bits[depth] = 0;
};