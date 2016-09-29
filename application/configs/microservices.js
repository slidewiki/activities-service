'use strict';

const co = require('../common');

module.exports = {
  'user': {
    uri: (!co.isEmpty(process.env.SERVICE_URL_USER)) ? process.env.SERVICE_URL_USER : 'userservice.experimental.slidewiki.org',
  },
  'deck': {
    uri: (!co.isEmpty(process.env.SERVICE_URL_DECK)) ? process.env.SERVICE_URL_DECK : 'deckservice.experimental.slidewiki.org',
  }
};
