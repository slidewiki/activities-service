'use strict';

const TinCan = require('tincanjs');
const transformUtil = require('./transformUtil');

module.exports = {

  transform: function (activity) {
    let statementCfg = transformUtil.prepareStatement(activity);
    statementCfg.verb = {
      id: 'https://w3id.org/xapi/acrossx/verbs/forked',
      display: {
        en: 'forked',
      },
    };
    let statement = new TinCan.Statement(statementCfg);
    return statement;
  },

};
