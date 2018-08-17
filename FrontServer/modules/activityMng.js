/**
 * 活动管理器
 * obj key 'activityList'
 * 存储data 的结构为{activity id：values， ...}
 */

var COMM = require("../../common/commons");
//var activity = require("../../Resources/activity.json");
var activityList = require("../../ProcessDB/selectOrInsert")();
var activityListGet = {};
//1	充值返利
//2	消费返利
//3	累计获得金币
var ACTIVITY_ID = {
    "chongzhi": 1
    ,"xiaofeigold": 2
    ,"jinbi":   4
    ,"xiaofeigem": 3
    ,"xiaofeibullion": 5
}

var MONEY_TYPE = {
    "GOLD": 1
    ,"DIAMOND": 2
}


//有效的区间检测
var inrangeDate = function(min, max, cur){
    return (min.getTime() < cur.getTime()&& cur.getTime() < max.getTime()+1*24*60*60*1000);
}

//获得有效的活动列表
var getList = function (date,cb) {
    var efflist = {};
    activityList.processActivitySelect(function (err,activity) {
        //console.log("----------Activity----------------------------activity", activity);
        if(err||activity == undefined){
            cb ([],[]);
            return;
        }

        for (var key=0; key < activity.length;key++){
            var row = activity[key];
            if(!COMM.checkHasOwn(row, ['start','stop'])){
                continue;
            }

            var dtSt = new Date(row['start']);
            var dtOt = new Date(row['stop']);
            /*console.log("-------------------------dtSt",dtSt);
            console.log("-------------------------dtOt",dtOt);*/
            if(!inrangeDate(dtSt, dtOt, date)){
                continue;
            }

            efflist[activity[key].detail_type] = row;
        }
        activityListGet = efflist;
        cb (efflist,activity);
    })

};

// 领取奖励
//用户记录的数据中dt +  活动ID 代表此活动的奖励是否被领取过，活动只允许领取一次奖励
var getAward = function (user, key) {
    var tbl = activityListGet;
    //console.log("-------------------------getAward key",key);
    if(!tbl){
        return null;
    }

    var _key = '' + key;
    var row = tbl[_key];
    //console.log("-------------------------getAward row",row);
    if(!row){
        return null;
    }


    var name = 'activityList';
    var list = user.getObjByString(name);
    if(row['number'] > list[_key]){
        return false;
    }

    //dt + 活动ID 代码此活动的奖励是否被领取过，活动只允许领取一次奖励
    var us = list['dt' + _key];
    if(us){
        var dt1 = new Date(row.start);
        var dt2 = new Date(us);
        if(dt1.getTime() == dt2.getTime()){
            return false;
        }
    }

    if(list[_key]){
        list[_key] = 0;
    }

    list['dt' +_key] = row['start'];
    //console.log("-------------------------getAward list",list);
    user.setObjToString(name, list);
    return row;
};

/**
 * 活动领取
 */
var recordData = function (user, key, num) {
    var tbl = activityListGet;
    if(!tbl){
        return false;
    }
    var _key = '' + key;
    var row = tbl[_key];
    if(!row){
        return false;
    }

    var name = 'activityList';
    var list = user.getObjByString(name);
    if(!list){
        return false;
    }

    if(list[_key]){
        list[_key] += num;
    }else{
        list[_key] = num;
    }
    //console.log("-------------------------recordData list",list);
    user.setObjToString(name, list);
    return true;
};

/**
 * 充值
 */
var recharge = function (user, num) {
    //console.log("-----------=========--------------recharge num",num);
    return this.recordData(user, ACTIVITY_ID.chongzhi, num);
}

/**
 * 消费返利
 */
var costGold = function (user, num) {
    //console.log("-----------=========--------------costGold num",num);
    return this.recordData(user, ACTIVITY_ID.xiaofeigold, num);
};
var costGem = function (user, num) {
    //console.log("-----------=========--------------costGem num",num);
    return this.recordData(user, ACTIVITY_ID.xiaofeigem, num);
};
var costBullion = function (user, num) {
    //console.log("-----------=========--------------costGem num",num);
    return this.recordData(user, ACTIVITY_ID.xiaofeibullion, num);
};
/**
 * 累计获得金币
 */
var recvGold = function (user, num) {
    //console.log("-----------=========--------------recvGold num",num);
    return this.recordData(user, ACTIVITY_ID.jinbi, num);
};

var test = function (user) {
    //console.log("----!!!!!!!!!!!=========--------------test");
    var tbl = getList(new Date());
    if(!tbl){
        return false;
    }
    for(var k in tbl){
        this.recordData(user, k, tbl[k].need_number);
    }
};



module.exports = {
    getList:getList
    ,recharge:recharge
    ,costGold:costGold
    ,costGem:costGem
    ,costBullion:costBullion
    ,recvGold:recvGold
    ,getAward:getAward
    ,recordData:recordData
    ,test:test

}