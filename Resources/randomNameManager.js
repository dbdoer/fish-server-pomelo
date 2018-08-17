//randomNameManager.js

var nicknameConfigs = require('./nickname.json').nickname;

module.exports = {
    getRandomNickname: getRandomNickname
}


function getRandomNickname() {
    var configsLength = nicknameConfigs.length;
    var r1 = Math.random();
    var randomNumber1 = parseInt(r1 * ( configsLength - 1 ));
    var randomName1 = nicknameConfigs[randomNumber1].name1;

    var r2 = Math.random();
    var randomNumber2 = parseInt(r2 * ( configsLength - 1 ));
    var randomName2 = nicknameConfigs[randomNumber2].name2;

    var name = randomName1 + randomName2;
    return name;
}