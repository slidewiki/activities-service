/*
Controller for handling mongodb and the data model activity while providing CRUD'ish.
*/

'use strict';

const helper = require('./helper'),
  activityModel = require('../models/activity.js'),
  oid = require('mongodb').ObjectID,
  collectionName = 'activities';

module.exports = {
  get: function(identifier) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.findOne({
        _id: oid(identifier)
      }));
  },

  getAllWithContentID: function(identifier) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find({ content_id: String(oid(identifier)) }))//TODO cast to String?
      .then((stream) => stream.sort({timestamp: -1}))
      .then((stream) => stream.toArray());
  },

  getAllWithProperties: function(userIdArray, slideIdArray, deckIdArray, idArray) {
    makeStringOIDArray(userIdArray);
    makeStringOIDArray(slideIdArray);
    makeStringOIDArray(deckIdArray);
    // idArray = ['574d55138164807f10c62f99'];
    // idArray[0] = oid(idArray[0]);
    makeOIDArray(idArray);

    const userIdQuery = {user_id: {$in: userIdArray}};
    const slideIdQuery = {$and: [{content_kind: 'slide'}, { content_id: { $in: slideIdArray } }]};
    const deckIdQuery = {$and: [{content_kind: 'deck'}, { content_id: { $in: deckIdArray } }]};
    const idQuery = {_id: {$in: idArray}};
    const query = {$or: [userIdQuery, slideIdQuery, deckIdQuery, idQuery]};
    // const query = {$or: [{user_id: {$in: []}, {$and: [{content_kind: 'slide'}, { content_id: { $in: [] } }]}, {$and: [{content_kind: 'slide'}, { content_id: { $in: [] } }]}]};

    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find(query))
      .then((stream) => stream.sort({timestamp: -1}))
      .then((stream) => stream.toArray());
  },

  getAllFromCollection: function() {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find())
      .then((stream) => stream.sort({timestamp: -1}))
      .then((stream) => stream.toArray());
  },

  insert: function(activity) {
    //TODO check for content id to be existant
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => {
        let valid = false;
        activity.timestamp = new Date();
        try {
          valid = activityModel(activity);
          if (!valid) {
            return activityModel.errors;
          }

          return col.insertOne(activity);
        } catch (e) {
          console.log('validation failed', e);
        }
        return;
      }); //id is created and concatenated automatically
  },

  replace: function(id, activity) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => {
        let valid = false;
        activity.timestamp = new Date();
        try {
          valid = activityModel(activity);

          if (!valid) {
            return activityModel.errors;
          }

          return col.findOneAndUpdate({_id: oid(id)}, activity, { upsert: true, returnNewDocument: true });
        } catch (e) {
          console.log('validation failed', e);
        }
        return;
      });
  },

  delete: function(identifier) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.remove({
        _id: oid(identifier)
      }));
  },

  deleteAllWithContentID: function(identifier) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.remove({
        content_id: identifier
      }));
  },

  deleteAll: function() {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.remove());
  },

  createCollection: function() {
    return helper.connectToDatabase()
      .then((db) => db.createCollection(collectionName));
  }

};

//convert array items to oid
function makeOIDArray(array) {
  if (array === undefined) {
    array = [];
  } else {
    for(let i = 0; i < array.length; i++) {
      array[i] = oid(array[i]);
    }
  }
}
function makeStringOIDArray(array) {
  if (array === undefined) {
    array = [];
  } else {
    array.forEach((item) => {
      item = String(oid(item));
    });
  }
}
