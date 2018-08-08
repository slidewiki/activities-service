'use strict';

const TinCan = require('tincanjs');
const xapi = require('../xapiUtil');

module.exports = {
  transform: function (activity) {
    let statementCfg = xapi.prepareStatement(activity);
    statementCfg.verb = {
      id: 'http://adlnet.gov/expapi/verbs/commented',
      display: {
        en: 'commented',
      },
    };
    let statement = new TinCan.Statement(statementCfg);
    return statement;
  },

};
