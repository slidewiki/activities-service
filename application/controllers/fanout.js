'use strict';

const xapiService = require('../services/xapi');

const self = module.exports = {

  forwardActivity: function(request, reply) {
    xapiService.sendActivities(request.payload)
    .then(reply)
    .catch((err) => {
      request.log('error', err);
      reply();
    });

  },

};
