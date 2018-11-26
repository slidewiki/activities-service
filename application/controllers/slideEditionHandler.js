/*
 Handles the requests by executing stuff and replying to the client. Uses promises to get stuff done.
 */
/* eslint promise/always-return: "off" */

'use strict';

const boom = require('boom'), //Boom gives us some predefined http codes and proper responses
  slideEditionDB = require('../database/slideEditionDatabase'), //Database functions specific for slide editions
  co = require('../common');


module.exports = {
  //Create slide Edition with new id and payload or return INTERNAL_SERVER_ERROR
  newSlideEdition: function(request, reply) {
    return slideEditionDB.insert(request.payload).then((inserted) => {
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

  //Delete slideEdition with id id
  deleteSlideEdition: function(request, reply) {
    return slideEditionDB.delete(encodeURIComponent(request.payload.id)).then(() =>
      reply({'msg': 'following is successfully deleted...'})
    ).catch((error) => {
      tryRequestLog(request, 'error', error);
      reply(boom.badImplementation());
    });
  },

  //Get All slide editions from database with the slide_id in the request
  getSlideEditionsBySlideId: function(request, reply) {
    return slideEditionDB.getSlideEditions(request.params.slide_id).then((slideEditions) => {
      slideEditions.forEach((slideEdition) => {
        co.rewriteID(slideEdition);
      });

      let jsonReply = JSON.stringify(slideEditions);
      reply(jsonReply);
    }).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Get All slide editions from database for the user_id in the request
  getSlideEditionsUser: function(request, reply) {
    const user_id = request.params.user_id;

    return slideEditionDB.getSlideEditionsByUser(user_id).then((slideEditions) => {
      slideEditions.forEach((slideEdition) => {
        co.rewriteID(slideEdition);
      });

      let jsonReply = JSON.stringify(slideEditions);
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
