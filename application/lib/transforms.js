'use strict';

const deckService = require('../services/deck');
const userService = require('../services/user');

const self = module.exports = {

  transform: function(activity, credentials) {
    // first verify we support the activity
    let doTransform = getTransform(activity.activity_type);
    if (!doTransform) return Promise.resolve();

    // all activities share some deck/user info
    // let's populate missing stuff here beforing getting deeper...
    return deckService.fetchContentItem(activity.content_kind, activity.content_id)
      .then((item) => {
        if (!item) {
          throw new Error(`could not find ${activity.content_kind} ${activity.content_id} for activity ${activity._id}`);
        }

        activity.content = item;

        // TODO these should be removed after we have a sane deck/slide response model
        if (item.revisions && item.revisions[0]) {
          Object.assign(activity.content, item.revisions[0]);
        }
        activity.content.id = activity.content._id;

        delete activity.content._id;
        delete activity.content.revisions;

        activity.user = {};

        if (credentials) {
          Object.assign(activity.user, {
            id: credentials.userid,
            username: credentials.username,
            mbox_sha1: sha1Hash(credentials.email),
          });
        }

        // just one user
        let userId = parseInt(activity.user_id);
        if (!userId) {
          throw new Error(`could not find user ${activity.user_id} for activity ${activity._id}`);
        }
        return userService.fetchUserInfo([userId]).then(([user]) => {
          if (!user || !user.username) {
            throw new Error(`could not find user ${activity.user_id} for activity ${activity._id}`);
          }

          Object.assign(activity.user, user);
          return doTransform(activity);
        });

      });

  },

};

// TODO support more activity types

const transforms = {
  'add'     : require('./transforms/add'),
  'comment' : require('./transforms/comment'),
  'delete'  : require('./transforms/delete'),
  'download': require('./transforms/download'),
  'edit'    : require('./transforms/edit'),
  'fork'    : require('./transforms/fork'),
  'react'   : require('./transforms/react'),
  'reply'   : require('./transforms/reply'),
  'share'   : require('./transforms/share'),
  'use'     : require('./transforms/use'),
  'view'    : require('./transforms/view'),
};

function getTransform(activityType) {
  let transformer = transforms[activityType];
  if (transformer) return transformer.transform;
}


// support computing sha1 hashes
let crypto = require('crypto');

function sha1Hash(str) {
  if (!str) return;

  let hash;
  hash = crypto.createHash('sha1');
  hash.update(str);

  let hexHash = hash.digest('hex');
  return hexHash;
}
