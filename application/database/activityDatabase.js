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

  getAll: function(identifier) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find({ content_id: String(oid(identifier)) }))//TODO cast to String?
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

          return col.update({_id: oid(id)}, activity, { upsert: true });
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
    console.log(oid(identifier));
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
