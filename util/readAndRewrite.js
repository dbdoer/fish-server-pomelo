/**
 * Created by 李峥 on 2016/3/22.
 * 临时工具
 */

var fs = require('fs');


var hosts = ['jp.a.cloudss.club',
    'jp.b.cloudss.club',
    'jp.c.cloudss.club',
    'jp.d.cloudss.club',
    'jp.e.cloudss.club',
    'jp.f.cloudss.club',
    'jp.g.cloudss.club',
    'hk.a.cloudss.club',
    'hk.b.cloudss.club',
    'hk.c.cloudss.club',
    'hk.d.cloudss.club',
    'sg.a.cloudss.club',
    'sg.b.cloudss.club',
    'sg.c.cloudss.club',
    'sg.d.cloudss.club',
    'tw.a.cloudss.club',
    'tw.b.cloudss.club',
    'kr.a.cloudss.club',
    'kr.b.cloudss.club',
    'us.a.cloudss.club',
    'us.b.cloudss.club',
    'us.c.cloudss.club',
    'us.d.cloudss.club',
    'us.e.cloudss.club',
    'us.f.cloudss.club',
    'uk.a.cloudss.club',
    'uk.b.cloudss.club',
    'de.a.cloudss.club']

var json = require('./gui-config.json');

var newConfigs = [];

for (var i = 0; i < hosts.length; i++) {
    newConfigs.push({
        "server": hosts[i],
        "server_port": 23842,
        "password": "157400",
        "method": "rc4-md5",
        "remarks": ""
    });
}

json["configs"] = newConfigs;

fs.writeFileSync("./newJson.json", JSON.stringify(json));

