/**
 * 获取活动列表
 */
var handlerMgr = require("./../handlerMgr");
var activityMgr = require("../../modules/activityMng");
var NID = handlerMgr.NET_ID;
var REDIS_UID_NAME = "fish4uid:";
var redis = require("../../../dao/redis/redisCmd");

handlerMgr.handler(NID.NI_CS_ACTIVITY_GET,function(packetId, param, next){
    //console.log("-------------------------410");
    var session = param.session;
    var user = param.user();
    if(user == undefined || session == undefined){
        next(1, NID.NI_SC_ACTIVITY_GET, { err: 1, activityList:[] });
        return;
    }
    var now = Date.now();
    var state = 0;
    activityMgr.getList(new Date(),function (list,activity) {
        //console.log("-------------------------list",list);

        /*"title" : "充值返利",
         "order" : 1,
         "title_corner" : 2,
         "picture" : "ui_gonggao_beiban_004.png",
         "title_icon" : 1,
         "start_time" : "2016-08-16",
         "over_time" : "2017-01-01",
         "activity_type" : 1,
         "attendMode" : 0,
         "detailed_type" : 1,
         "need_number" : 18,
         "reward_type" : 2,
         "reward_number" : 360*/
        var userInfo = user.getObjByString('activityList');//本地数据里面去拿活动信息
        //console.log("-------------------------userInfo",userInfo);
        //var rewardInfo = [];

        var cpData = function(row){

            var stat = true;
            var rewardInfo = [];
            //潜规则
            //dt + 活动ID 代表此活动的奖励是否被领取过，活动只允许领取一次奖励
            var us = userInfo['dt' + row.aid];
            if(us){
                var dt1 = new Date(row.start);
                var dt2 = new Date(us);
                stat = dt1.getTime() !== dt2.getTime();
            }
            //console.log("-------------------------rewardInfo",row.tool_info);
            var toolInfo = JSON.parse(row.tool_info);
            for(var m=0;m<toolInfo.length;m++){
                rewardInfo.push({propID:toolInfo[m].goodId*1,propNum:toolInfo[m].goodNum*1});
            }
            return {/*aid          : row.aid,
                title       :row.title,
                order        :row.order,
                titleCorner  :row.title_corner ,
                picture     :row.picture,
                titleIcon    :row.title_icon ,
                startTime   :row.start_time,
                overTime    :row.over_time,
                activiytType :row.activity_type ,
                detailedType :row.detailed_type ,
                curTargetNum :userInfo[row.aid] ,
                needTargetNum:row.need_number ,
                rewardType		:row.reward_type,
                rewardNum		 :row.reward_number ,
                attendMode		:row.attendMode
                ,state :stat*/
                aid          : row.aid,
                title       :row.title,
                order        :row.order,
                titleCorner  :row.label ,
                picture     :row.file_name,
                titleIcon    :row.icon ,
                startTime   :row.start,
                overTime    :row.stop,
                activiytType :row.type ,
                detailedType :row.detail_type ,
                curTargetNum :userInfo[row.aid] ,
                needTargetNum:row.number ,
                attendMode		:row.area,
                state :stat,
                rewardInfo:rewardInfo,
                link         :row.image
            };
        }

        var retList = [];
        for(var key in list){
            var row = list[key];
            row.aid = parseInt(key);
            retList.push(cpData(row));

        }
        //console.log("-------------------------retList",retList);

        //activityMgr.test(user);//存本地
        user.writeToDb();

        ////////后台检测，符合则发邮件
        var templeId = 2;
        var tempMail = global.mail[templeId];
        var tempMailInfo = [];
        var repContent = [];
        var mailGoods = [];
        var list2 = user.getObjByString('activityList');
        /*console.log("-------------------------list2",list2);
        console.log("-------------------------userInfo",userInfo);*/
        for (var i=0; i < activity.length;i++){
            for(var key in userInfo){
                if(activity[i].detail_type == key){
                    var us = userInfo['dt' + key];
                    if(!us || us != activity[i].start){
                        if(now > new Date(activity[i].stop).getTime()+1*24*60*60*1000 && userInfo[key] >= activity[i].number){
                            state = 1;
                            list2['dt' +activity[i].detail_type] = activity[i]['start'];
                            var propInfo = JSON.parse(activity[i].tool_info);
                            for(var s=0; s < propInfo.length;s++){
                                mailGoods.push({goodId:propInfo[s].goodId*1,goodNum:propInfo[s].goodNum*1});
                            }
                        }
                    }

                }

            }

        }
        if(state ==1){
            tempMailInfo.push({
                type: tempMail.mail_type,
                templateId: templeId,
                replacement: repContent,
                itemList: mailGoods
            });
            var rpcTS = session.getRpcManager().getRpcByRType('TransfeServer');
            if(rpcTS != undefined){
                var method = rpcTS.getMethod('sendMailInfo');
                if(method != undefined){
                    redis.get(REDIS_UID_NAME + user.getValue('outsideUuid'), function (err,uid) {
                        if(err || uid == null){
                            logger.err("---4112-------err = %s || uid = %s" + err + uid);
                            next(1, NID.NI_SC_ACTIVITY_GET, {err: 5, activityList:[]});
                            return;
                        }
                        method({sendType: 1, mailInfo: tempMailInfo, userInfo: [uid]}, function (err) {
                            if (err) {
                                next(1, NID.NI_SC_ACTIVITY_GET, {err: 6, activityList:[]});
                            }
                            user.setObjToString('activityList', list2);
                            user.writeToDb(function(){});
                        });
                    });
                }
                else{
                    next(1, NID.NI_SC_ACTIVITY_GET, {err: 7,activityList:[]});
                    return;
                }
            }
            else{
                next(1, NID.NI_SC_ACTIVITY_GET, {err: 8,activityList:[]});
                return;
            }
        }
        /////////发邮件结束
        //console.log("-------------------------retList",retList);
        next(null, NID.NI_SC_ACTIVITY_GET, {
            err:0,
            activityList:retList
        });
    });//获得有效时间内的活动

})
