/**
 * Redis 游戏中二次封装，接口以回调方式提供，负责回收机制
 * 
 */
var redis = require("./redis");
var REDIS_NAME = "GameServer";

function exists(cmd,cb) {
    redis.execute(REDIS_NAME,function(client, release){
    client.exists(cmd,
        function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
}
function  set(cmd, param, cb) {
    redis.execute(REDIS_NAME,function(client, release){
        client.set(cmd,param, function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
}

function get(cmd,cb) {
    redis.execute(REDIS_NAME,function(client, release){
        client.get(cmd, function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
}

function incr(cmd,cb) {
    redis.execute(REDIS_NAME,function(client, release){
        client.incr(cmd, function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
}

function incrby(cmd,cb) {
    redis.execute(REDIS_NAME,function(client, release){
        client.incrby(cmd, function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
}

function decr(cmd,cb) {
    redis.execute(REDIS_NAME,function(client, release){
        client.decr(cmd, function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
}
function decrby(cmd,num, cb) {
    redis.execute(REDIS_NAME,function(client, release){
        client.decrby(cmd, num, function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
}

function del(cmd,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.del(cmd,function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
};

function hgetall(cmd,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.hgetall(cmd,
            function (err, reply) {
                release();
                if(cb){cb(err, reply);}
            });
    });
};

function hmset(cmd,param,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.hmset(cmd,param,
            function (err, reply) {
                release();
                if(cb){cb(err, reply);}
            });
    });
};

function hmget(cmd,param,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.hmget(cmd,param, function (err, reply) {
                if(cb){cb(err, reply);}
                release();
            });
    });
};

function hkeys(cmd,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.hkeys(cmd,function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
};
function hvals(cmd,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.hvals(cmd,function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
};


function hdel(cmd,param,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.hdel(cmd,param,function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
};
function hexists(cmd,param,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.hexists(cmd,param,function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
};
function hset(cmd,param0,param1,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.hset(cmd,param0,param1,function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
};
function hget(cmd,param0,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.hget(cmd,param0,function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
};
function hlen(cmd,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.hlen(cmd,function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
};

function lpush(cmd,param, cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.lpush(cmd,param,
            function (err, reply) {
                release();
                if(cb){cb(err, reply);}
            });
    });
};

function rpush(cmd,param, cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.rpush(cmd,param,
            function (err, reply) {
                release();
                if(cb){cb(err, reply);}
            });
    });
};


function rpop(cmd, cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.rpop(cmd,
            function (err, reply) {
                release();
                if(cb){cb(err, reply);}
            });
    });
};


function lpop(cmd, cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.lpop(cmd,
            function (err, reply) {
                release();
                if(cb){cb(err, reply);}
            });
    });
};

function lrange(cmd,p1, p2,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.lrange(cmd,p1,p2,
            function (err, reply) {
                release();
                if(cb){cb(err, reply);}
            });
    });
};

function llen(cmd,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.llen(cmd,
            function (err, reply) {
                release();
                if(cb){cb(err, reply);}
            });
    });
};

function lset(cmd, p1, p2, cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.lset(cmd, p1, p2,
            function (err, reply) {
                release();
                if(cb){cb(err, reply);}
            });
    });
};


function keys(cmd,cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.keys(cmd,function (err, reply) {
            release();
            if(cb){cb(err, reply);}
        });
    });
};

function proc_multi_hdel(list,cb) {
    redis.execute(REDIS_NAME, function(client, release){
        var multi = client.multi();
        for(var i=0; i<list.length; i++) {
            multi.set("hdel ",list[i]);   //and set it
        }
        multi.exec(function(err,reply){
            release();
            if(reply){cb(err, replies);}
        });
    });
};

function proc_multi_rpop(list,cb) {
    redis.execute(REDIS_NAME, function(client, release){
        var multi = client.multi();
        for(var i=0; i<list.length; i++) {
            multi.set("rpop ",list[i]);   //and set it
        }
        multi.exec(function(err,reply){
            release();
            if(cb){cb(err, reply);}
        });
    });
};

function lrem(cmd, p1, p2, cb){
    redis.execute(REDIS_NAME,function(client, release){
        client.lrem(cmd,p1,p2,
            function (err, reply) {
                release();
                if(cb){cb(err, reply);}
            });
    });
};


module.exports = {
    exists: exists
    ,set: set
    ,get: get
    ,del: del
    ,hset:hset
    ,hget:hget
    ,hmset: hmset
    ,hmget: hmget
    ,hgetall: hgetall
    ,hkeys: hkeys
    ,hvals: hvals
    ,hdel: hdel
    ,hexists:hexists
    ,hlen:hlen
    ,incr:incr
    ,incrby:incrby
    ,decr:decr
    ,decrby:decrby
    ,lpush:lpush
    ,rpush:rpush
    ,lpop:lpop
    ,llen:llen
    ,rpop:rpop
    ,lrange:lrange
    ,lset:lset
    ,keys:keys
    ,multi_hdel:proc_multi_hdel
    ,multi_rpop:proc_multi_rpop
    ,lrem:lrem
};
