/**
 * mysql连接管理接口集
 */
var fs = require('fs');
var mysql = require('mysql');
var gpool = require('generic-pool');

//存放当前已经初始化的Mysql连接池对象映射 { dbname : poolob }
var pools = {};

/**
 * 创建Mysql连接池对象
 * @param {String} dbname 连接池名称
 * @param {JSON} cfg 配置数据
 */
var createMysqlPool = function (dbname, cfg) {
	return gpool.Pool({
		name : dbname,
		create : function(cb) {
			var client = mysql.createConnection({
				host: cfg.host,
				user: cfg.user,
				password: cfg.password,
				database: cfg.database
			});
			client.on('error', function(err) {
				console.error('连接Mysql出现错误: %s', err.stack);
			});
			cb(null, client);
		},
		destroy : function(client) {
			client.end();
		},
		max : 10,
		idleTimeoutMillis : cfg.idleTimeoutMillis,
		log : cfg.log
	});
};

/**
 * 初始化Mysql连接池
 * @param {JSON} config 数据库Mysql连接配置数据
 */
var configure = function (config) {
	if (typeof config === 'string') {
		config = JSON.parse(fs.readFileSync(config, 'utf8'));
	}
	for (var k in config) {
		var _pool = createMysqlPool(k, config[k]);
		pools[k] = _pool;
	}
};

/* 执行Mysql命令
 * @param {String} dbname 数据库分库名称(指配置文件里配置的名称)
 * @param {String} sql Statement The sql need to excute.
 * @param {Object} args The args for the sql.
 * @param {fuction} cb Callback function.
 * 
 */
var query = function (dbname, sql, args, cb) {
	var pool = pools[dbname];
	pool.acquire(function(err, client) {
		if (!!err) {
			console.error('执行Mysql命令时报错: %s', err.stack);
			return;
		}
		client.query(sql, args, function(err, res) {
			pool.release(client);
			cb(err, res);
		});
	});
};

var query2 = function (dbname, sql, cb) {
	var pool = pools[dbname];
	pool.acquire(function(err, client) {
		if (!!err) {
			console.error('执行Mysql命令时报错: %s', err.stack);
			return;
		}
		client.query(sql, function(err, res) {
			pool.release(client);
			cb(err, res);
		});
	});
};
module.exports = {
	configure : configure,
	query : query,
	query2 : query2
};




