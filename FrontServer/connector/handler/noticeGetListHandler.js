/**
 * 获取公告列表
 */
var handlerMgr = require("./../handlerMgr");
var noticeList = require("../../../ProcessDB/selectOrInsert")();
var NID = handlerMgr.NET_ID;

handlerMgr.handler(NID.NI_CS_NOTICE_GET,function(packetId, param, next){
    var user = param.user();
    if(user == undefined){
        next(1, NID.NI_SC_NOTICE_GET, { err: 1, activityList:[] });
        return;
    }
    var now = Date.now();
    noticeList.processNoticeSelect(function (err,result) {
        //console.log("----------411-------------------------------result", result);
        if(err || result == undefined){
            next(1, NID.NI_SC_NOTICE_GET, {err: 3,dataPropList :[]});
            return;
        }
        var noticeList = [];
        for (var i = 0; i < result.length; i++) {
            if(result[i] == undefined){ continue; }
            if(result[i].start_time == undefined || result[i].stop_time == undefined ){
                continue;
            }
            var temp_start = new Date(result[i].start_time.replace(/-/g,  "/")).getTime();
            var temp_stop = new Date(result[i].stop_time.replace(/-/g,  "/")).getTime();
            if (now > temp_start && now < temp_stop+1*24*60*60*1000) {
                noticeList.push({
                    nid:result[i].id,
                    title:result[i].title,
                    order:result[i].order,
                    titleCorner:result[i].label,
                    imageName:result[i].file_name,
                    detailContent:result[i].content,
                    startTime:result[i].start_time,
                    overTime:result[i].stop_time,
                    link:result[i].image
                });
            }
        }
        //console.log("----------411-----------------------noticeList", noticeList);
        //[{nid:1,title:"aaa",order:1,titleCorner:"NEW",imageName:"gameNotice_1484125492.png",detailContent:"bbbb",startTime:"2017-01-11",overTime:"2017-01-13"}]
        next(null, NID.NI_SC_NOTICE_GET, { err:0, noticeList:noticeList });
    });

})
