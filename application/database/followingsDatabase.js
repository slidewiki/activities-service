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

  getFollowings: function(type, identifier) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find({followed_type: type, followed_id: identifier }))
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
