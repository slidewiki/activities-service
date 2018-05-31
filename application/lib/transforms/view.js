'use strict';

const TinCan = require('tincanjs');
const Microservices = require('../../configs/microservices');

const xapi = require('../xapiUtil');

const self = module.exports = {

  transform: function(activity) {
    let lang = activity.content.language.replace(/_/g, '-');

    let statement = new TinCan.Statement({

      verb: {
        id: 'http://adlnet.gov/expapi/verbs/experienced',
        display: {
          en: 'experienced',
        },
      },

      actor: xapi.actor(activity.user),

      object: {
        id: `${Microservices.platform.uri}/${activity.content_kind}/${activity.content_id}`,
        definition: {
          name: {
            [lang]: activity.content.title,
          },
          description: {
            [lang]: activity.content.description || undefined,
          },
        },
      },

    });

    return statement;
  },

};
