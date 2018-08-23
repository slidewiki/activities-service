/*
Controller for handling mongodb and the data model following while providing CRUD'ish.
*/

'use strict';

const helper = require('./helper'),
  followingModel = require('../models/following.js'),
  oid = require('mongodb').ObjectID,
  collectionName = 'followings';

module.exports = {
  get: function(identifier) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.findOne({
        _id: oid(identifier)
      }));
  },

  getFollowings: function(user_id,  followed_type, followed_id) {
    let queryArray = [];
    if (user_id !== undefined) {
      queryArray.push({user_id: user_id});
    }if (followed_type !== undefined) {
      queryArray.push({followed_type: followed_type });
    }
    if (followed_id !== undefined) {
      queryArray.push({followed_id: followed_id });
    }

    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find({$and: queryArray}))
      .then((stream) => stream.toArray());
  },

  getFollowingsForDeckAndPlaylistArrays(deckIdArray, playlistIdArray) {
    if (deckIdArray.length === 0 && playlistIdArray.length === 0) {
      return new Promise((resolve) => {
        resolve([]);
      });
    }
    const deckTypeQuery = {$and: [{followed_type: 'deck'}, { followed_id: { $in: deckIdArray } }]};
    const playlistTypeQuery = {$and: [{followed_type: 'playlist'}, { followed_id: { $in: playlistIdArray } }]};

    let query = {$or: [deckTypeQuery, playlistTypeQuery]};

    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find(query))
      .then((stream) => stream.toArray());
  },

  getFollowingsForTypesAndIds(typeArray, idsArrayOfArrays) {
    if (typeArray.length === 0 || idsArrayOfArrays.length === 0) {
      return new Promise((resolve) => {
        resolve([]);
      });
    }
    let queryArray = [];
    for (let i = 0; i < typeArray.length; i++) {
      queryArray.push({$and: [{followed_type: typeArray[i]}, { followed_id: { $in: idsArrayOfArrays[i] } }]});
    }

    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find({$or: queryArray}))
      .then((stream) => stream.toArray());
  },

  getAllFromCollection: function() {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find().sort({timestamp: -1}))
      .then((stream) => stream.toArray());
  },

  insert: function(following) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => {
        let valid = false;
        try {
          valid = followingModel(following);
          if (!valid) {
            return followingModel.errors;
          }

          return col.insertOne(following);
        } catch (e) {
          console.log('validation failed', e);
        }
        return;
      }); //id is created and concatenated automatically
  },

  delete: function(identifier) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.remove({
        _id: oid(identifier)
      }));
  },

  createCollection: function() {
    return helper.connectToDatabase()
      .then((db) => db.createCollection(collectionName));
  }
};
