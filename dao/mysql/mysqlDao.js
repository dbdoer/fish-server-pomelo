var mysql = require("./mysql");
var mysqlDao = module.exports;

/**
 * execute sql cmd
 * @param {String} cmd
 * @param {String} args
 * @param {function} cb
 */
mysqlDao.execute = function (dbname, cmd, args, cb) {
    mysql.query(dbname, cmd, args, cb);
};
mysqlDao.execute2 = function (dbname, cmd, cb) {
    mysql.query2(dbname, cmd, cb);
};
/**
 * execute sql procedure
 * @param {String} cmd
 * @param {String} args
 * @param {function} cb
 */
mysqlDao.executeProc = function (dbname, cmd, args, cb) {
	mysql.query(dbname, 'CALL '+ cmd, args, cb);
};
