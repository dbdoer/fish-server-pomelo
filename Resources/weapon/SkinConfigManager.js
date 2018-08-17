//SkinConfigManager.js

var skinConfigs = require('./skin.json').skin;
var skinDefaultConfigs = require('./skin_default.json').skin_default;
var skinGasConfigs = require('./skin_gas.json').skin_gas;
var superWeaponConfigs = require('./superweapon.json').superweapon;
var weaponBaseConfigs = require('./weapon.json').weapon;

var skinServerConfigs = [];
var defaultSkinId = 10110;
var weaponmap = {}

var WEAPON_NORMAL = 1;
var WEAPON_SUPER = 2;
var BULLET_SINGLE = 1;
var BULLET_THROUGH = 2;
var BULLET_RANGE = 3;
var BULLET_RAINBOW = 4;

for (var i in weaponBaseConfigs) {
    var obj = weaponBaseConfigs[i];
    weaponmap[obj.weapon_id] = obj;
}

for (var i in skinConfigs) {
    var skinServerConfig = {};
    var skinConfig = skinConfigs[i];

    skinServerConfig.skinId = parseInt(skinConfig.pilot);
    skinServerConfig.unlockAct = skinConfig.unlock_act;
    skinServerConfig.unlockCostType = skinConfig.unlock;
    skinServerConfig.unlockCostCount = skinConfig.unlock_num;
    skinServerConfig.weapons = {};
    if (skinServerConfig.skinId == 10110) {
        for (var j in skinDefaultConfigs) {
            var obj = skinDefaultConfigs[j];
            skinServerConfig.weapons[obj.weapon_index] = obj;
        }
    }else if (skinServerConfig.skinId == 10111) {
        for (var j in skinGasConfigs) {
            var obj = skinGasConfigs[j];
            skinServerConfig.weapons[obj.weapon_index] = obj;
        }
    }
    skinServerConfigs.push(skinServerConfig);
}

module.exports = {
    getUnlockCostTypeAndCount: getUnlockCostTypeAndCount,
    getDefaultSkinId: getDefaultSkinId,
    getWeaponInfo: getWeaponInfo,
    calculationSingle: calculationSingle,
    calculationMuti: calculationMuti,
    weaponTypesBetweenCost: weaponTypesBetweenCost,
    weaponTypesBetweenIndexs: weaponTypesBetweenIndexs,
    getWeaponSkinConfig: getWeaponSkinConfig,
    weaponIndexByType: weaponIndexByType
}

function getUnlockCostTypeAndCount(skin) {
    for (var i in skinServerConfigs) {
        var skinServerConfig = skinServerConfigs[i];
        if (skinServerConfig.skinId == skin) {
            var obj = {};
            obj.costType = skinServerConfig.unlockCostType;
            obj.costCount = skinServerConfig.unlockCostCount;
            return obj;
        }
    }
    return null;
}

function getDefaultSkinId() {
    return defaultSkinId;
}

function getWeaponSkinConfig(skinId, weaponIndex) {
    for (var i in superWeaponConfigs) {
        var skinServerConfig = superWeaponConfigs[i];
        if (skinServerConfig.weapon_index == weaponIndex) {
            return superWeaponConfigs[i];
        }
    }

    for (var i in skinServerConfigs) {
        var skinServerConfig = skinServerConfigs[i];
        if (skinServerConfig.skinId == skinId) {
            return skinServerConfig.weapons[weaponIndex];
        }
    }
    return null;
}

function getWeaponInfo(id) {
    return weaponmap[id];
}

function calculationSingle(fireinfo, penetrationrate, value, skinId) {
    var weapon = weaponmap[fireinfo.weapon];
    var weaponSkin = getWeaponSkinConfig(skinId, weapon.weapon_index);

    if (weaponSkin.bullet_type == BULLET_SINGLE) {
        var p = fireinfo.energy / value;
        fireinfo.energy = 0;
        return (p < 1) ? p : 1;
    } else if (weaponSkin.bullet_type == BULLET_THROUGH) {
        var p = penetrationrate * value;
        var result = (penetrationrate * value > fireinfo.energy) ? fireinfo.energy / value : penetrationrate;
        fireinfo.energy -= p;
        return result;
    }
}

function calculationMuti(fireinfo, treshold, tresholdsum, value, skinId) {
    var weapon = weaponmap[fireinfo.weapon]
    var weaponSkin = getWeaponSkinConfig(skinId, weapon.weapon_index);

    if (weaponSkin.bullet_type == BULLET_RANGE) {
        var p = (tresholdsum < fireinfo.energy) ? treshold / value : (fireinfo.energy * treshold) / (tresholdsum * value);
        return p;
    } else if (weaponSkin.bullet_type == BULLET_RAINBOW) {
        var p = (tresholdsum < fireinfo.totalEnergy / 4) ? treshold / value : fireinfo.totalEnergy / 4 * treshold / tresholdsum / value;
        return p;
    }
}

function weaponTypesBetweenCost(min, max) {
    var weapons = [];
    for (var i in weaponmap) {
        var weapon = weaponmap[i];
        if (weapon.cost >= min && weapon.cost <= max) {
            weapons.push(weapon.weapon_id);
        }
    }
    return weapons;
}

function weaponTypesBetweenIndexs(index1, index2) {
    var weapons = [];
    for (var i in weaponmap) {
        var weapon = weaponmap[i];
        if (parseInt(weapon.weapon_index) >= parseInt(index1) && parseInt(weapon.weapon_index) <= parseInt(index2)) {
            weapons.push(weapon.weapon_id);
        }
    }
    return weapons;
}

function weaponIndexByType(weaponType) {
    var weapons = [];
    for (var i in weaponmap) {
        var weapon = weaponmap[i];
        if (parseInt(weapon.weapon_id) == parseInt(weaponType)) {
            return weapon.weapon_index;
        }
    }
    return -1;
}