var ioredis = require("ioredis");
var conf_redis = require("../conf/config").redis;
//之后换成读取配置
function getCluster() {

    var arr = [];
    var ports = conf_redis.ports;
    for(var i=0; i< ports.length; i++){
        arr.push({port: ports[i], host: conf_redis.ip});
    }
    return new ioredis.Cluster(arr);

    //var host = "192.168.24.58";
    //return new ioredis.Cluster([
    //    {port: 6379, host: host},
    //    {port: 6380, host: host},
    //    {port: 6381, host: host},
    //    {port: 6382, host: host},
    //    {port: 6383, host: host},
    //    {port: 6384, host: host}
    //]);
}

function getNormal() {
    return new ioredis({
        port: conf_redis.normal,
        host: conf_redis.ip,
        family: 4,
        password: conf_redis.password,
        db: 0
    });
}

module.exports = {
    getCluster: getNormal
    //getCluster: getCluster
};


