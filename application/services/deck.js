'use strict';

const rp = require('request-promise-native');
const Microservices = require('../configs/microservices');

const self = module.exports = {

  // promises deck/slide data
  fetchContentItem: function(kind, id) {

    return rp.get({
      uri: `${Microservices.deck.uri}/${kind}/${id}`,
      json: true,
    }).catch((err) => {
      // return nothing if not found
      if (err.statusCode === 404) return;
      throw new Error(`could not read ${kind} ${id}`);
    });

  },

};
