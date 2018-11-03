'use strict';

const xapi = require('../xapiUtil');

module.exports = {

  transform: function (activity) {
    let statement = xapi.prepareStatement(activity);

    statement.verb = {
      id: 'http://activitystrea.ms/schema/1.0/create',
      display: {
        en: 'created',
      },
    };

    return statement;
  },

};
