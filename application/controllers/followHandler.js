/*
Handles the requests by executing stuff and replying to the client. Uses promises to get stuff done.
*/
/* eslint promise/always-return: "off" */

'use strict';

const boom = require('boom'), //Boom gives us some predefined http codes and proper responses
  followingsDB = require('../database/followingsDatabase'), //Database functions specific for followings
  co = require('../common');


module.exports = {

  //Create Following with new id and payload or return INTERNAL_SERVER_ERROR
  newFollowing: function(request, reply) {
    return followingsDB.insert(request.payload).then((inserted) => {
      if (co.isEmpty(inserted.ops) || co.isEmpty(inserted.ops[0]))
        throw inserted;
      else {
        reply(co.rewriteID(inserted.ops[0]));
      }
    }).catch((error) => {
      tryRequestLog(request, 'error', error);
      reply(boom.badImplementation());
    });
  },

  //Delete Following with id id
  deleteFollowing: function(request, reply) {
    return followingsDB.delete(encodeURIComponent(request.payload.id)).then(() =>
      reply({'msg': 'following is successfully deleted...'})
    ).catch((error) => {
      tryRequestLog(request, 'error', error);
      reply(boom.badImplementation());
    });
  },

  //Get All Followings from database for the followed_type and followed_id in the request
  getFollowings: function(request, reply) {
    return followingsDB.getFollowings(undefined, request.params.followed_type, request.params.followed_id).then((followings) => {
      followings.forEach((following) => {
        co.rewriteID(following);
      });

      let jsonReply = JSON.stringify(followings);
      reply(jsonReply);
    }).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Get All Followings from database for the user_id in the request
  getFollowingsForFollower: function(request, reply) {
    const user_id = request.params.user_id;
    const followed_type = request.query.followed_type;
    const followed_id = request.query.followed_id;

    return followingsDB.getFollowings(user_id, followed_type, followed_id).then((followings) => {
      followings.forEach((following) => {
        co.rewriteID(following);
      });

      let jsonReply = JSON.stringify(followings);
      reply(jsonReply);
    }).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  }
};

//This function tries to use request log and uses console.log if this doesnt work - this is the case in unit tests
function tryRequestLog(request, message, _object) {
  try {
    request.log(message, _object);
  } catch (e) {
    console.log(message, _object);
  }
}
