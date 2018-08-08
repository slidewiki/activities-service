'use strict';

const boom = require('boom');

const TinCan = require('tincanjs');
const transformUtil = require('./transformUtil');

module.exports = {

  transform: function (activity) {
    // TODO support more reaction types ?
    if (activity.react_type !== 'like') {
      throw boom.badData(`Unsupported reaction type: ${activity.react_type}`);
    }

    let statementCfg = transformUtil.prepareStatement(activity);

    statementCfg.verb = {
      id: 'https://w3id.org/xapi/acrossx/verbs/liked',
      display: {
        en: 'liked',
      },
    };

    let statement = new TinCan.Statement(statementCfg);
    return statement;

  },

};
