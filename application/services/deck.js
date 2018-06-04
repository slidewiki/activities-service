'use strict';

const rp = require('request-promise-native');
const Microservices = require('../configs/microservices');

const self = module.exports = {

  // promises deck/slide data
  fetchContentItem: function(kind, id) {

    return rp.get({
      uri: `${Microservices.deck.uri}/${kind}/${id}`,
      json: true,
    });

  },

};
