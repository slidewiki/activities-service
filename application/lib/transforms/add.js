'use strict';

const TinCan = require('tincanjs');
const xapi = require('../xapiUtil');

module.exports = {

  transform: function (activity) {
    let statementCfg = xapi.prepareStatement(activity);
    statementCfg.verb = {
      id: 'http://activitystrea.ms/schema/1.0/create',
      display: {
        en: 'created',
      },
    };
    let statement = new TinCan.Statement(statementCfg);
    return statement;
  },

};
