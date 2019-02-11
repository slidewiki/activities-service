/*
 Controller for handling mongodb and the data model following while providing CRUD'ish.
 */

'use strict';

const helper = require('./helper'),
  slideCurrentlyEditedModel = require('../models/slideCurrentlyEdited.js'),
  oid = require('mongodb').ObjectID,
  collectionName = 'slideCurrentlyEdited';

module.exports = {
  get: function(identifier) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.findOne({
        _id: oid(identifier)
      }));
  },

  getSlideEditions: function(slideId) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find({slideCurrentlyEdited: slideId}))
      .then((stream) => stream.toArray());
  },

  getSlideEditionsByUser: function(userId) {
    return helper.connectToDatabase()
      .then((db) => db.collection())
      .then((col) => col.find({userId: userId}))
      .then((stream) => stream.toArray());
  },


  insert: function(slideEdition) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => {
        let valid = false;
        try {
          valid = slideCurrentlyEditedModel(slideEdition);
          if (!valid) {
            return slideEdition.errors;
          }

          slideEdition.timestamp = new Date(slideEdition.timestamp);
          return col.insertOne(slideEdition);
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
