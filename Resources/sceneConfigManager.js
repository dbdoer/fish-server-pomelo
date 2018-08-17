var sceneConfigs = require('./scene.json').fishfarm;
var trackConfig = require('./track.json');

module.exports = {

    getTrackIdsByFishFarmId: function (fishFarmId) {
        var trackConfigIndexs = [];
        for (var i in sceneConfigs) {
            if (sceneConfigs[i].FishFarm_ID == fishFarmId) {
                trackConfigIndexs = sceneConfigs[i].Track_Index.split('|');
            }
        }

        var trackIds = [];
        for (var i in trackConfig.basetrack) {
            for (var j in trackConfigIndexs) {
                if (trackConfig.basetrack[i].Track_Index == trackConfigIndexs[j]) {
                    trackIds.push(trackConfig.basetrack[i].Track_id);
                }
            }
        }
        return trackIds;
    },

    getRequiredWeaponIndex: function (sceneId) {
        var weaponIndexs = [];
        for (var i in sceneConfigs) {
            if (sceneConfigs[i].FishFarm_ID == sceneId) {
                weaponIndexs = sceneConfigs[i].Range_Of_Weapon.split('|');
            }
        }

        return weaponIndexs;
    },

    getSceneIdByIndex: function (index) {
        for (var i in sceneConfigs) {
            if (sceneConfigs[i].Map_Index == index) {
                return sceneConfigs[i].FishFarm_ID;
            }
        }
        return 0;
    },

    getAllSceneIds: function () {
        var sceneIds = [];
        for (var i in sceneConfigs) {
            if (sceneConfigs[i].Type == 2) {
                sceneIds.push(parseInt(sceneConfigs[i].FishFarm_ID));
            }
        }
        return sceneIds;
    },

    getSceneMaxEnergy: function (fishFarmId) {
        for (var i in sceneConfigs) {
            if (sceneConfigs[i].FishFarm_ID == fishFarmId) {
                return sceneConfigs[i].Energy_Stored_Up;
            }
        }
        return 0;
    },

    getSpecialTracks: function (fishFarmId) {
        var result = [];
        for (var i in sceneConfigs) {
            if (sceneConfigs[i].FishFarm_ID == fishFarmId) {
                result = sceneConfigs[i].SpecialTrack_Index.split('|');
            }
        }
        if (result.length == 0) {
            console.log(" getSpecialTracks is null, fishFarmId: " + fishFarmId);
        }
        return result;
    },

    getSpecialShowTracks: function (fishFarmId) {
        var result = [];
        for (var i in sceneConfigs) {
            if (sceneConfigs[i].FishFarm_ID == fishFarmId) {
                if (!sceneConfigs[i].SpecialTrackShow_Index) {
                    sceneConfigs[i].SpecialTrackShow_Index = "";
                }
                result = sceneConfigs[i].SpecialTrackShow_Index.split('|');
            }
        }
        if (result.length == 0) {
            console.log(" getSpecialShowTracks is null, fishFarmId: " + fishFarmId);
        }
        return result;
    },

    getUnlockSceneIdByWeapon: function (TypeId) {

        for (var i in sceneConfigs) {
            if (sceneConfigs[i].Item_For_Unlock == parseInt(TypeId)) {
                return sceneConfigs[i].FishFarm_ID;
            }
        }
        return -1;
    },

    getSceneEventType: function (fishFarmId) {
        for (var i in sceneConfigs) {
            if (sceneConfigs[i].FishFarm_ID == fishFarmId) {
                return sceneConfigs[i].SceneEvent_Type;
            }
        }
        return 0;
    }

}
