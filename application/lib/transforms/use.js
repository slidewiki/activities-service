'use strict';

const xapi = require('../xapiUtil');

module.exports = {

  transform: function (activity) {
    let statement = xapi.prepareStatement(activity);

    statement.verb = {
      id: 'https://w3id.org/xapi/acrossx/verbs/used',
      display: {
        en: 'used',
      },
    };

    return statement;
  },

};
