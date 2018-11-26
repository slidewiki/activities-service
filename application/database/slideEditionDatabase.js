/*
 Controller for handling mongodb and the data model following while providing CRUD'ish.
 */

'use strict';

const helper = require('./helper'),
  slideEditionModel = require('../models/slideEdition.js'),
  oid = require('mongodb').ObjectID,
  collectionName = 'currentEditions';

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
      .then((col) => col.find({slide_in_edition: slideId}))
      .then((stream) => stream.toArray());
  },

  getSlideEditionsByUser: function(userId) {
    return helper.connectToDatabase()
      .then((db) => db.collection())
      .then((col) => col.find({user_id: userId}))
      .then((stream) => stream.toArray());
  },


  insert: function(slideEdition) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => {
        let valid = false;
        try {
          valid = slideEditionModel(slideEdition);
          if (!valid) {
            return slideEdition.errors;
          }
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
