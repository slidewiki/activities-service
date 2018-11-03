'use strict';

const TinCan = require('tincanjs');

const util = require('./util');

const deckService = require('../services/deck');
const userService = require('../services/user');

const self = module.exports = {

  list: function() {
    return Object.keys(transforms);
  },

  transform: async function(activity, credentials) {
    // first verify we support the activity
    let doTransform = getTransform(activity.activity_type);
    if (!doTransform) return;

    // all activities share some deck/user info
    // let's populate missing stuff here beforing getting deeper...

    // try to find a root
    if (!activity.content_root_id) {
      let roots = await deckService.fetchContentItemRoots(activity.content_kind, activity.content_id);
      // TODO what to do when roots is of zero size ???
      if (roots && roots.length === 1) {
        activity.content_root_id = util.toIdentifier(roots[0]);
      }
    }

    let item = await deckService.fetchContentItem(activity.content_kind, activity.content_id, activity.content_root_id);
    if (!item) {
      throw new Error(`could not find ${activity.content_kind} ${activity.content_id} for activity ${activity._id}`);
    }
    activity.content = item;

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

    let [user] = await userService.fetchUserInfo([userId]);
    if (!user || !user.username) {
      throw new Error(`could not find user ${activity.user_id} for activity ${activity._id}`);
    }
    Object.assign(activity.user, user);

    let statement = doTransform(activity);
    // console.log(JSON.stringify(statement, null, 2));

    return new TinCan.Statement(statement);
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
