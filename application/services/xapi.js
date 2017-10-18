'use strict';

const config = require('../configuration');
const rp = require('request-promise-native');
const Microservices = require('../configs/microservices');

const self = module.exports = {

  sendActivities: function(payload, authToken) {
    let headers = {};
    if (authToken) headers[config.JWT.HEADER] = authToken;

    return rp.post({
      uri: `${Microservices.xapi.uri}/activities`,
      json: true,
      body: payload,
      headers,
    });
  },

};
