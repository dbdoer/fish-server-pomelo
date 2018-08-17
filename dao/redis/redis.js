/**
 * Redis连接管理接口集
 * 
 * @author <a href="qingcheng.huang@chukong-inc.com>Neil</a>
 * @date 2013.05.22
 */
var fs = require('fs');
var redis = require('redis');
var gpool = require('generic-pool');

//存放当前已经初始化的Redis连接池对象映射 { dbname : poolob }
var pools = {};

/**
 * 创建Redis连接池对象
 * @param {String} dbname 连接池名称
 * @param {JSON} cfg 配置数据
 */
function createRedisPool(dbname, cfg) {
    var opts = {
        "no_ready_check" : cfg.proxy,
        "password": cfg.password
    };
    
    return gpool.Pool({
        name : dbname,
        dbIndex : 0,
        create : function(cb) {
            var client = redis.createClient(cfg.port, cfg.hostname, opts);
            client.on('error', function(err) {
                console.error('连接Redis出现错误: %s', err.stack);
            });
            cb(null, client);
        },
        destroy : function(client) {
            if (!cfg.proxy) {
                client.quit();
            }
        },
        max : cfg.max,
        idleTimeoutMillis : cfg.idleTimeoutMillis,
        log : cfg.log
    });
}

/**
 * 初始化Redis连接池
 * @param {JSON} config 数据库Redis连接配置数据
 */
function initRedisPool(config) {
    for (var item in config) {
        var _pool = createRedisPool(item, config[item]);
        pools[item] = _pool;
    }
}

/**
 * 配置Redis连接
 * @param {String} config 指定配置文件的地址
 */
function configure(config) {
    config = config || process.env.REDIS_CONFIG;
    
    if (typeof config === 'string') {
        config = JSON.parse(fs.readFileSync(config, 'utf8'));
    }
    
    if (config) {
        initRedisPool(config);
    }
}


 /* 执行Redis命令
 * @param {String} dbname 数据库分库名称(指配置文件里配置的名称)
 * @param {Function} execb 申请执行Redis命令成功的回调，接收client物件及release回调
 */
function execute(dbname, execb) {
    var pool = pools[dbname];
    pool.acquire(function(err, client) {
        var release = function() { pool.release(client); };
        if (err) {
            console.error('执行Redis命令时报错: %s', err.stack);
            release();
        } else {
            execb(client, release);
        }
    }, 0);
}

/**
 * 实时输出此模块的当前状态
 */
function info() {
    return Object.keys(pools).map(function(k) {
        var pitem = pools[k];
        return {
            name : pitem.getName(),
            total : pitem.getPoolSize(),
            available : pitem.availableObjectsCount(),
            waiting : pitem.waitingClientsCount()
        };
    });
}

//setInterval(function() {
//         console.error('redis pool is %j', info());
//}, 5000);

module.exports = {
    configure   : configure,
    execute     : execute,
    info        : info
};
