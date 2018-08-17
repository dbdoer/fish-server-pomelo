var exchangeconfigs = require('./exchange.json').exchange;

var mobileConfigMap = {};
var cardConfigMap = {};

for (var i in exchangeconfigs) {
    var obj = exchangeconfigs[i];
    if (obj.exchange_type == 1) {
        mobileConfigMap[obj.exchange_id] = obj;
    }
    else {
        cardConfigMap[obj.exchange_id] = obj;
    }
}

module.exports = {
    getMobileExchangeConfigById: getMobileExchangeConfigById,
    getCardExchangeConfigById: getCardExchangeConfigById
}

function getMobileExchangeConfigById(id) {
    return mobileConfigMap[id];
}

function getCardExchangeConfigById(id) {
    return cardConfigMap[id];
}