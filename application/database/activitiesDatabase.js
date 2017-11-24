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

  getCountAllOfTypeForDeckOrSlide: function(activity_type, content_kind, identifier) {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.count({content_kind: content_kind, content_id: identifier, activity_type: activity_type }));
  },

  getAllForDeckOrSlide: function(content_kind, identifier, skip, limit) {
    if (!skip) {
      skip = 0;
    } else {
      skip = parseInt(skip);
    }
    if (!limit) {
      limit = 0;
    } else {
      limit = parseInt(limit);
    }
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find({content_kind: content_kind, content_id: identifier }).sort({timestamp: -1}).skip(skip).limit(limit))
      .then((stream) => stream.toArray());
  },

  getAllOfTypeForDeckOrSlide: function(activity_type, content_kind, identifier, skip, limit) {
    if (!skip) {
      skip = 0;
    } else {
      skip = parseInt(skip);
    }
    if (!limit) {
      limit = 0;
    } else {
      limit = parseInt(limit);
    }
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find({content_kind: content_kind, content_id: identifier, activity_type: activity_type }).sort({timestamp: -1}).skip(skip).limit(limit))
      .then((stream) => stream.toArray());
  },

  getAllWithProperties: function(userIdArray, slideIdArray, deckIdArray, idArray, ownerId, skip, limit) {
    if (!skip) {
      skip = 0;
    } else {
      skip = parseInt(skip);
    }
    if (!limit) {
      limit = 0;
    } else {
      limit = parseInt(limit);
    }
    
    makeOIDArray(idArray);

    const userIdQuery = {user_id: {$in: userIdArray}};
    const slideIdQuery = {$and: [{content_kind: 'slide'}, { content_id: { $in: slideIdArray } }]};
    const deckIdQuery = {$and: [{content_kind: 'deck'}, { content_id: { $in: deckIdArray } }]};
    const idQuery = {_id: {$in: idArray}};

    //Modified ownerQuery to exclude documents where user_id i ownerId
    //This is temporary solution for the user notifications
    //This will be changed when proper subscription is implemented

    const ownerQuery = {$and: [{content_owner_id: ownerId}, { user_id: { $ne: ownerId } }]};
    const query = (ownerId !== undefined && ownerId !== 0) ?
      {$or: [userIdQuery, slideIdQuery, deckIdQuery, idQuery, ownerQuery]}
      :
      {$or: [userIdQuery, slideIdQuery, deckIdQuery, idQuery]};
    // const query = {$or: [{user_id: {$in: []}, {$and: [{content_kind: 'slide'}, { content_id: { $in: [] } }]}, {$and: [{content_kind: 'slide'}, { content_id: { $in: [] } }]}]};

    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find(query).sort({timestamp: -1}).skip(skip).limit(limit))
      .then((stream) => stream.toArray());
  },

  getAllFromCollection: function() {
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.find().sort({timestamp: -1}))
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

  insertArray: function(activities) {
    //TODO check for content id to be existant
    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => {

        try {
          activities.forEach((activity) => {
            activity.timestamp = new Date();
            let valid = activityModel(activity);
            if (!valid) {
              return activityModel.errors;
            }
          });

          return col.insertMany(activities);
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

  deleteAllWithContentTypeUser: function(content_kind, content_id, activity_type, user_id) {
    let query = {};
    if (content_kind !== undefined) {
      query.content_kind = content_kind;
    }
    if (content_id !== undefined) {
      query.content_id = content_id;
    }
    if (activity_type !== undefined) {
      query.activity_type = activity_type;
    }
    if (user_id !== undefined) {
      query.user_id = user_id;
    }

    return helper.connectToDatabase()
      .then((db) => db.collection(collectionName))
      .then((col) => col.remove(query));
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
