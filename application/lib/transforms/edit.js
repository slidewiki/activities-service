'use strict';

const TinCan = require('tincanjs');
const Microservices = require('../../configs/microservices');

const xapi = require('../xapiUtil');

const self = module.exports = {

  transform: function(activity) {
    let statement = new TinCan.Statement({

      verb: {
        id: 'https://w3id.org/xapi/acrossx/verbs/edited',
        display: {
          en: 'edited',
        },
      },

      actor: xapi.actor(activity.user),

      object: {
        id: `${Microservices.platform.uri}/${activity.content_kind}/${activity.content_id}`,
        definition: {
          name: {
            en: activity.content.title,
          },
          description: {
            en: activity.content.description || undefined,
          },
        },
      },

    });

    return statement;
  },

};
