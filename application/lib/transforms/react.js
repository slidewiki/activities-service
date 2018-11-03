'use strict';

const boom = require('boom');

const xapi = require('../xapiUtil');

module.exports = {

  transform: function (activity) {
    // TODO support more reaction types ?
    if (activity.react_type !== 'like') {
      throw boom.badData(`Unsupported reaction type: ${activity.react_type}`);
    }

    let statement = xapi.prepareStatement(activity);

    statement.verb = {
      id: 'https://w3id.org/xapi/acrossx/verbs/liked',
      display: {
        en: 'liked',
      },
    };

    return statement;
  },

};
