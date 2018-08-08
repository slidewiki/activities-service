'use strict';

const TinCan = require('tincanjs');
const xapi = require('../xapiUtil');

module.exports = {

  transform: function (activity) {
    let statementCfg = xapi.prepareStatement(activity);
    statementCfg.verb = {
      id: 'https://w3id.org/xapi/acrossx/verbs/replied',
      display: {
        en: 'replied',
      },
    };
    let statement = new TinCan.Statement(statementCfg);
    return statement;
  },

};
