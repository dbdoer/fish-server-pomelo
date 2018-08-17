/**
 * Created with JetBrains WebStorm.
*/

var _ = require("underscore");
var fs = require("fs");
var path = require("path");

var NET_ID = {
    NI_SC_ACCOUNT_REPETITION: 4099
    , NI_CS_ACCOUNT_SWITCH: 100
    , NI_SC_ACCOUNT_SWITCH: 4100
    , NI_CS_LOGIN: 101
    , NI_SC_LOGIN: 4101
    , NI_CS_CHANGE_NAME: 102
    , NI_SC_CHANGE_NAME: 4102
    , NI_CS_MODIFY_HEAD: 103
    , NI_SC_MODIFY_HEAD: 4103
    , NI_CS_GET_MAIL: 104
    , NI_SC_GET_MAIL: 4104
    , NI_CS_MAIL_CHECK: 105
    , NI_SC_MAIL_CHECK: 4105
    , NI_CS_MAIL_DEL: 106
    , NI_SC_MAIL_DEL: 4106
    , NI_SC_MESSAGE_REMIND: 4107
    , NI_CS_MAIL_ADJUNCT: 108
    , NI_SC_MAIL_ADJUNCT: 4108
    , NI_CS_MAIL_ONEKEY_ADJUNCT: 109
    , NI_SC_MAIL_ONEKEY_ADJUNCT: 4109
    , NI_CS_MAIL_ONEKEY_DEL: 110
    , NI_SC_MAIL_ONEKEY_DEL: 4110
    , NI_CS_PROP_USE: 111
    , NI_SC_PROP_USE: 4111
    , NI_CS_PROP_GIVE: 112
    , NI_SC_PROP_GIVE: 4112
    , NI_CS_GOODS_LIST: 113
    , NI_SC_GOODS_LIST: 4113
    , NI_CS_GOODS_EXCHANGE: 114
    , NI_SC_GOODS_EXCHANGE: 4114
    , NI_CS_MONTHCARD_USE: 115
    , NI_SC_MONTHCARD_USE: 4115
    , NI_CS_COEFFICIENT_DEBUG: 116
    , NI_SC_COEFFICIENT_DEBUG: 4116
    , NI_CS_REDEEM_CODE_USE: 117
    , NI_SC_REDEEM_CODE_USE: 4117
    , NI_CS_GIFT_GIVE: 118
    , NI_SC_GIFT_GIVE: 4118
    , NI_CS_GIFT_RECORD: 119
    , NI_SC_GIFT_RECORD: 4119
    , NI_CS_CHECK_STATE: 125
    , NI_SC_CHECK_STATE: 4125

    , NI_CS_ENTER_ROOM: 201
    , NI_SC_ENTER_ROOM: 4201
    , NI_CS_LEAVE_ROOM: 205
    , NI_SC_LEAVE_ROOM: 4205
    , NI_CS_FIRE: 207
    , NI_SC_FIRE: 4207
    , NI_CS_EXPLOSION: 209
    , NI_SC_EXPLOSION: 4209
    , NI_CS_EXPRESSION_INFO: 220
    , NI_SC_EXPRESSION_INFO: 4220
    , NI_CS_CHANGE_WEAPON: 221
    , NI_CS_HEARTBEAT: 222
    , NI_SC_HEARTBEAT: 4222
    , NI_CS_UNLOCK_SKIN: 227
    , NI_SC_UNLOCK_SKIN: 4227
    , NI_CS_CHANGE_SKIN: 228
    , NI_SC_CHANGE_SKIN: 4228
    , NI_SC_BROADCAST_CHANGE_SKIN: 4229
    , NI_SC_BROADCAST_CHANGEWEAPON: 4231

    , NI_CS_GUIDE_STEP: 230
    , NI_SC_GUIDE_STEP: 4230
    , NI_SC_BROAD_CAST_EXPRESSION_INFO: 4233
    , NI_SC_SPECIAL_WEAPON_Energy: 4234
    , NI_CS_SPECIAL_WEAPON_FIRE: 235
    , NI_SC_SPECIAL_WEAPON_FIRE: 4235
    , NI_CS_SPECIAL_EXPLOSION: 236
    , NI_SC_BROADCAST_SPECIAL_FIRE: 4236
    , NI_SC_BROADCAST_GIFT_GIVE: 4237
    , NI_SC_GIFT_REMAIN: 4238

    , NI_CS_NORMAL_ROOM_LIST: 261
    , NI_SC_NORMAL_ROOM_LIST: 4261
    , NI_CS_CHANGE_SITE: 262
    , NI_SC_CHANGE_SITE: 4262
    , NI_CS_FAST_MATCH_LIST: 264
    , NI_SC_FAST_MATCH_LIST: 4264
    , NI_CS_FAST_MATCH_SIGNUP: 265
    , NI_SC_FAST_MATCH_SIGNUP: 4265
    , NI_CS_GET_MATCH_RANK: 267
    , NI_SC_GET_MATCH_RANK: 4267

    , NI_CS_BIG_MATCH_LIST: 271
    , NI_SC_BIG_MATCH_LIST: 4271
    , NI_CS_BIG_MATCH_ENTERROOM: 272
    , NI_SC_BIG_MATCH_ENTERROOM: 4272
    , NI_CS_BIG_MATCH_PLAYERSCORE: 273
    , NI_SC_BIG_MATCH_PLAYERSCORE: 4273
    , NI_CS_RANKING_LIST: 275
    , NI_SC_RANKING_LIST: 4275
    , NI_CS_GET_FRIENDLIST: 276
    , NI_SC_GET_FRIENDLIST: 4276
    , NI_CS_GET_FRIEND_REQUESTLIST: 277
    , NI_SC_GET_FRIEND_REQUESTLIST: 4277
    , NI_CS_FRIEND_REQUESTDEAL: 278
    , NI_SC_FRIEND_REQUESTDEAL: 4278
    , NI_CS_FIND_FRIEND: 279
    , NI_SC_FIND_FRIEND: 4279
    , NI_CS_AGAIN_ENTER_MATCH: 280
    , NI_SC_AGAIN_ENTER_MATCH: 4280
    , NI_CS_ADD_FRIEND: 282
    , NI_SC_ADD_FRIEND: 4282
    , NI_CS_DEL_FRIEND: 283
    , NI_SC_DEL_FRIEND: 4283
    , NI_SC_FRIEND_REQUEST: 4284
    , NI_CS_FRIEND_INVITE: 285
    , NI_SC_FRIEND_INVITE: 4285
    , NI_SC_INVITE_FRIEND: 4286
    , NI_CS_FRIEND_INVITEDEAL: 287
    , NI_SC_FRIEND_INVITEDEAL: 4287

    , NI_SC_FASTMATCH_RANK_SELF: 4301
    , NI_SC_THEMESWITCH_READY: 4302
    , NI_SC_THEMESWITCH_BEGIN: 4303

    , NI_CS_ACTIVITY_GET: 410
    , NI_SC_ACTIVITY_GET: 4410
    , NI_CS_NOTICE_GET: 411
    , NI_SC_NOTICE_GET: 4411
    , NI_CS_ACTIVITY_REWARD: 420
    , NI_SC_ACTIVITY_REWARD: 4420

    , NI_CS_TOTAL_NUM_FAST_MATCH: 500
    , NI_SC_TOTAL_NUM_FAST_MATCH: 4500
    , NI_CS_DEBUG_COMMAND: 501
    , NI_SC_DEBUG_COMMAND: 4501


    , NI_CS_UseSkill: 601
    , NI_SC_UseSkill: 4601

    , NI_CS_ONLINE_AWARD_LIST: 710
    , NI_SC_ONLINE_AWARD_LIST: 4710
    , NI_CS_ONLINE_AWARD: 711
    , NI_SC_ONLINE_AWARD: 4711

    , NI_CS_TIME: 801
    , NI_SC_TIME: 4801
    , NI_CS_TIME_AWARD: 802
    , NI_SC_TIME_AWARD: 4802
    , NI_CS_SUBSIDY: 803
    , NI_SC_SUBSIDY: 4803
    , NI_CS_SUBSIDY_REWARD: 804
    , NI_SC_SUBSIDY_REWARD: 4804
    , NI_CS_TOTALSIGN_REWARD: 805
    , NI_SC_TOTALSIGN_REWARD: 4805
    , NI_SC_PUSH_SIGN_DATA: 4806
    , NI_CS_SIGN_IN: 807
    , NI_SC_SIGN_IN: 4807
    , NI_CS_SIGN_IN_AWARD: 808
    , NI_SC_SIGN_IN_AWARD: 4808
    , NI_SC_FULL_SERVICE_NOTICE_DATA: 4809
    , NI_SC_BROADCAST_GOLD: 4810

    , NI_CS_PURCH_PRODUCT: 901
    , NI_SC_PURCH_PRODUCT: 4901
    , NI_TEST: 999

};

var handlerMgr = module.exports;
handlerMgr.NET_ID = NET_ID;
handlerMgr.container = [];

handlerMgr.handler = function (mid, cb) {
    this.container[mid] = cb;
};

//, cb
handlerMgr.trigger = function (mid, param, next) {
    if (_.isString(mid)) {
        mid = parseInt(mid);
    }

    //console.log("trigger = %d", mid);
    if (this.container[mid]) {
        this.container[mid](mid, param, next);
    } else {
        console.log("error no process handler = %d", mid);
        //next(null, mid, {code: -1, msg:"net id not register"});
    }
};


/**
 * 消息注册
 */
handlerMgr.register = function () {
    var dir = "./FrontServer/connector/handler/";
    dir = path.resolve(dir);

    //
    var files = fs.readdirSync(dir);
    for (var i = 0; i < files.length; i++) {
        var match = /^(.*)\.js$/.exec(files[i]);
        if (match) {
            var modulename = match[1];
            var fn = path.join(dir, files[i]);
            if (fs.statSync(fn).isFile()) {
                //console.log("------fn =======\n" +  fn);
                require(fn);
            }
        }
    }
};

