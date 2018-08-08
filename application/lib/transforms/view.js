'use strict';

const TinCan = require('tincanjs');
const transformUtil = require('./transformUtil');

module.exports = {

  transform: function (activity) {
    let statementCfg = transformUtil.prepareStatement(activity);
    statementCfg.verb = {
      id: 'http://adlnet.gov/expapi/verbs/experienced',
      display: {
        en: 'experienced',
      },
    };

    let statement = new TinCan.Statement(statementCfg);
    return statement;
  },

};
