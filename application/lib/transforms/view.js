'use strict';

const xapi = require('../xapiUtil');

module.exports = {

  transform: function (activity) {
    let statement = xapi.prepareStatement(activity);

    statement.verb = {
      id: 'http://adlnet.gov/expapi/verbs/experienced',
      display: {
        en: 'experienced',
      },
    };

    return statement;
  },

};
