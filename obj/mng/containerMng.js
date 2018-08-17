/**
 * Module dependencies
 */
var util = require('util');
var _ = require('underscore');
var containerBag    = require('./containerBag');
var containerGift    = require('./containerGift');
var containerFriend = require('./containerFriend');
var containerFriendReq   = require('./containerFriendReq');
var containerMail   = require('./containerMail');
var containerGoods   = require('./containerGoods');
var containerCode   = require('./containerCode');

/**
 m_Pages and db
 |-----------------------------------------------------------|
 |key         |value0    |value1   |value2   |valueN  | ...  |
 |-----------------------------------------------------------|
 |bag0        |obj0      |obj1     |obj2     |objN    | ...  |
 |-----------------------------------------------------------|
 |friends       |objfriend0   |objfriend1 |objfriendN       |
 |-----------------------------------------------------------|
 |mailss       |objmail0   |objmail1 |objmailN       |
 |-----------------------------------------------------------|

 contmng

 * container manager
 * 根据container 长度做自动初始化
 * this.bag      背包管理器
 * this.friends  好友管理器
 */
var ContainerMng = function() {
    this.bag = new containerBag();
    this.gift = new containerGift();
    this.friends = new containerFriend() ;
    this.friendReq = new containerFriendReq() ;
    this.mails = new containerMail() ;
    this.goods = new containerGoods() ;
    this.codes = new containerCode() ;
};

/**
 * Expose 'ContainerMng' constructor.
 */
module.exports = ContainerMng;

/**
 * init cont manager
 * @api public
 */
ContainerMng.prototype.init = function() {
    this.bag.init([]);
    this.gift.init([]);
    this.friends.init([]);
    this.friendReq.init([]);
    this.mails.init([]);
    this.goods.init([]);
    this.codes.init([]);
};
