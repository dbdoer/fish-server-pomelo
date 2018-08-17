var fishcfg = require('./fish.json');
var cardcfd = require('./card.json').card;

var fishmap = {};
var weaponmap = {};
var cardMap = {};

var bigFishTypes = [];
var miniFishTypes = [];
var highScoreWeaponTypes = [];
var lowScoreWeaponTypes = [];

//����
var WEAPON_NORMAL = 1;
var WEAPON_SUPER = 2;
var BULLET_SINGLE = 1;
var BULLET_THROUGH = 2;
var BULLET_RANGE = 3;
var BULLET_RAINBOW = 4;

for (var iKey in fishcfg) {
    var obj = fishcfg[iKey];
    fishmap[iKey] = obj;
}

for (var i in cardcfd) {
    var obj = cardcfd[i];
    var cardId = obj.card_id;
    var sceneIds = [];
    if (obj.card_scene) {
        sceneIds = obj.card_scene.split('|');
    }

    for (var j in sceneIds) {
        var sceneId = sceneIds[j];
        var cardsOfScene = cardMap[sceneId];
        if (!cardsOfScene) {
            cardMap[sceneId] = [];
        }
        var isFind = false;
        for (var m in cardsOfScene) {
            var card = cardsOfScene[m];
            if (card == cardId) {
                isFind = true;
            }
        }
        if (!isFind) {
            cardMap[sceneId].push(cardId);
        }
    }
}

module.exports = {
    getFishInfo: function (id) {
        return fishmap[id];
    },

    fishTypesBetweenScore: function (min, max) {
        var fishs = [];
        for (var i in fishmap) {
            var fish = fishmap[i];
            if (fish.gold >= min && fish.gold <= max) {
                fishs.push(fish.id);
            }
        }
        return fishs;
    },

    randomCardIdByScene: function (sceneId) {
        if (cardMap[sceneId]) {
            var cards = cardMap[sceneId];
            var length = cards.length;
            var probabilityUnit = 1 / parseFloat(length);
            var randomNumber = Math.random();
            var probabilitySum = probabilityUnit;
            for (var i in cards) {
                if (randomNumber <= probabilitySum) {
                    console.log(" probabilitySum : " + probabilitySum + " randomNumber : " + randomNumber)
                    return cards[i];
                }

                if (i == length - 1) {
                    console.log(" last of cards, probabilitySum : " + probabilitySum + " randomNumber : " + randomNumber)
                    return cards[i];
                }
                probabilitySum += probabilityUnit;
            }
        }
        return 0;
    }
}