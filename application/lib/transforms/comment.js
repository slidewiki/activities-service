'use strict';

const xapi = require('../xapiUtil');

module.exports = {

  transform: function (activity) {
    let statement = xapi.prepareStatement(activity);

    statement.verb = {
      id: 'http://adlnet.gov/expapi/verbs/commented',
      display: {
        en: 'commented',
      },
    };

    return statement;
  },

};
