
//全局变量

/**
 * commons function
 * add by jason
 */
module.exports = {
    _DEBUG: true,
    // get range num [begin, end)
    INRANGE_RANDOM: function(begin, end) {
        return Math.floor(Math.random()*this.ABS(end - begin) + this.MIN(begin, end));
    },
    INRANGE_RANDOM_FLOAT: function(begin, end) {
        return Math.random()*this.ABS(end - begin) + this.MIN(begin, end);
    },
    ABS:function(num) {return num<0 ? num*-1: num;},
    MAX:function(num1, num2) {return num1<num2 ? num2: num1;},
    MIN:function(num1, num2) {return num1<num2 ? num1: num2;}

    //1970/01/01 至今的秒数
    ,timestamp: function(){
        return Math.floor(Date.now()/1000);
    }

    /**
     * 是否为同一天
     */
    ,isSameDate: function(date1,date2) {
    return (date1.getFullYear() ===  date2.getFullYear()&&
        date1.getMonth() ===  date2.getMonth()&&
        date1.getDate() ===  date2.getDate());
    }

    /**
     * 游戏时间是否一天
     * 游戏每日五点刷新
     * update time 5:00
     */
    ,isSameGameDay: function(dt1,dt2) {
    var date1 = new Date((dt1-5*60*60)*1000);
    var date2 = new Date((dt2-5*60*60)*1000);
    return this.isSameDate(date1, date2);
    }

    //复制对象
    ,clone : function(obj){
        var target = {};
        for(var k in obj){
            target[k] = obj[k];
        }
        return target;
    }

    ,TimestampToDatetime : function(seconds){
        var date = new Date(seconds*1000);
        var year = date.getFullYear();
        var month = date.getMonth()+1;
        var day = date.getDate();
        var hour = date.getHours();
        var minutes = date.getMinutes();
        var second = date.getSeconds();
        return String(year+"-"+month+"-"+day+" "+hour+":"+minutes +":"+second);
    },
    invokeCallback : function(cb) {
        if (!!cb && typeof cb === 'function') {
            cb.apply(null, Array.prototype.slice.call(arguments, 1));
        }
    }

    ,checkHasOwn :function(row, keys){
        for(var k in keys){
            if(!row.hasOwnProperty(keys[k])){
                return false;
            }
        }

        return true;
    },propDrop :function(bullionNum, bullionRate){
        if(bullionNum == undefined || bullionRate == undefined){
            return 0;
        }
        /// 是否掉落
        if(bullionNum *1 > 0){
            var randBullion = 0;//Math.random()* 1;
            var percentNum = 1 / (bullionNum *1);
            var count = bullionNum; /// 实际给的数量(至少一个)
            var len = 0;
            if(randBullion > percentNum){
                while(1){
                    randBullion = randBullion - percentNum;
                    if(randBullion < 0){ break; }
                    count += 1;
                    len ++;
                    if(len > 100){ break; } /// 防止死循环
                }
            }

            var rateNum = bullionRate *1 * 100;
            var randRate = this.INRANGE_RANDOM(0, 100);
            /// 是否大于设置的概率
            if(rateNum >= randRate){
                return count;
            }
        }
        return 0;
    }, isUseSkillBySkillName : function (curUseSkillId, skillName) {
        if(curUseSkillId == undefined || skillName == undefined){
            return false;
        }
        var result = false;
        if(Object.keys(curUseSkillId).length > 0){
            for(var key in curUseSkillId){
                if(curUseSkillId[key] == skillName){
                    result = true;
                }
            }
        }
        return result;
    }
};
