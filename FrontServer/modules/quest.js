/**
 * Created by 李峥 on 2016/3/16.
 * 任务模块
 * 只有同步数据和领取奖励两个接口
 * 目前客户端没有任务实现
 * 随便传个假数据
 */

var questRewardConfigs = require(".././quest/quest_reward.json").quest_reward;

var randomQuestConfigs = require(".././quest/quest_random.json").quest_random;
var mainQuestConfigs = require(".././quest/quest_online.json").quest_online;
//var log = require('../../log/log').logger("normal");


var redis;
var session;
var rpcManager;

var mods = {};


var REDIS_KEY_USER_INFO = "fish4user:";//用户信息记录


//同步数据 需要登录检查 进入房间前调用
mods["240"] = function (sid, uid, data, cb) {
    if (!uid) {
        //没登录
        return;
    }
    var clientQuestIndex = data.questIndex;
    var serverMaxQuestIndex = mainQuestMaxIndex();

    var theLastQuestIndex = 0;
    redis.hmget(REDIS_KEY_USER_INFO + uid, "isMainQuestCompleted", function (err, result) {
        var isMainQuestCompleted = result;
        var lastMainQuestId;
        if (clientQuestIndex == -1 ||
            clientQuestIndex > serverMaxQuestIndex ||
            isMainQuestCompleted) {
            isMainQuestCompleted = true;
            lastMainQuestId = getMainQuestConfigByIndex(serverMaxQuestIndex);
            theLastQuestIndex = -1;
        } else {
            if (this.lastMainQuestId == 0) {
                theLastQuestIndex = 1;
            } else {
                var serverMainQuestConfig = getQuestConfigById(this.lastMainQuestId);
                if (!serverMainQuestConfig) {
                    theLastQuestIndex = 1;
                } else {
                    theLastQuestIndex = serverMainQuestConfig.index;
                    if (theLastQuestIndex < clientQuestIndex) {
                        theLastQuestIndex = clientQuestIndex;
                        var clientMainQuestConfig = getMainQuestConfigByIndex(clientQuestIndex);
                        if (clientMainQuestConfig) {
                            this.lastMainQuestId = clientMainQuestConfig.quest_id;
                        } else {
                            //log.info("!!!!!!!!!!!!!!!!clientMainQuestConfig is null!!!!!!!!!!!!!!! quest index : " + clientQuestIndex);
                        }
                    }
                }
            }
        }

        cb(null, 4240, "SC_SynchData", {questIndex: theLastQuestIndex});
    });
};

//领取任务奖励
mods["701"] = function (sid, uid, data, cb) {
    if (!uid) {
        //没登录
        return;
    }

};


module.exports = function (_session, _rpcManager, _redis) {
    session = _session;
    rpcManager = _rpcManager;
    redis = _redis;
    return mods;
};


//根据传入的场景id获取一个随机任务 本文件用不到
function getRandomQuestConfig(sceneId) {
    var resuletQuestConfigs = [];

    for (var i in randomQuestConfigs) {
        var config = randomQuestConfigs[i];
        var isFind = false;
        if (sceneId == config.quest_scene) {
            resuletQuestConfigs.push(config);
        }
    }

    var num = resuletQuestConfigs.length;
    if (num == 0) {
        return null;
    }

    var index = Math.random() * num;

    return resuletQuestConfigs[parseInt(index)];
}

//获取下一个主线任务配置 跑解锁条件
function getNextMainQuestConfig(currentQuestId) {
    for (var i in mainQuestConfigs) {
        var config = mainQuestConfigs[i];
        if (config.quest_id == currentQuestId) {
            var nextConfig = getQuestConfigById(config.next_quest);
            if (nextConfig && nextConfig.quest_type == 1) {
                return nextConfig;
            } else {
                return null;
            }
        }
    }
    //log.info("getNextMainQuestConfig quest_id no match");
    return null;
}

function getrewardConfigById(id) {
    for (var i in questRewardConfigs) {
        var config = questRewardConfigs[i];
        if (config.reward_id == id) {
            return config;
        }
    }

    //log.info(" QuestManager getrewardConfigById reward id null ");
    return null;
}

function getQuestConfigById(id) {
    for (var i in randomQuestConfigs) {
        var config = randomQuestConfigs[i];
        if (config.quest_id == id) {
            return config;
        }
    }

    for (var i in mainQuestConfigs) {
        var config = mainQuestConfigs[i];
        if (config.quest_id == id) {
            return config;
        }
    }

    return null;
}


function getMainQuestConfigByIndex(index) {
    for (var i in mainQuestConfigs) {
        var config = mainQuestConfigs[i];
        if (config.index == index) {
            return config;
        }
    }

    return null;
}

function getMainQuestConfigs() {
    return mainQuestConfigs;
}

function mainQuestMaxIndex() {
    var max = 0;
    for (var i in mainQuestConfigs) {
        if (mainQuestConfigs[i].index >= max) {
            max = mainQuestConfigs[i].index;
        }
    }
    return max;
}
