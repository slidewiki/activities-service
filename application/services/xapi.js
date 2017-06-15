'use strict';

const rp = require('request-promise-native');
const Microservices = require('../configs/microservices');

const self = module.exports = {

  sendActivities: function(payload) {
    return rp.post({
      uri: `${Microservices.xapi.uri}/activities`,
      json: true,
      body: payload,
    });
  },

};
