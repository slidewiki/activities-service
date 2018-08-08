'use strict';

const TinCan = require('tincanjs');
const transformUtil = require('./transformUtil');

module.exports = {

  transform: function (activity) {
    let statementCfg = transformUtil.prepareStatement(activity);
    statementCfg.verb = {
      id: 'https://w3id.org/xapi/acrossx/verbs/edited',
      display: {
        en: 'edited',
      },
    };
    let statement = new TinCan.Statement(statementCfg);
    return statement;
  },

};
