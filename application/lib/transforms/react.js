'use strict';

const boom = require('boom');

const TinCan = require('tincanjs');
const Microservices = require('../../configs/microservices');

const xapi = require('../xapiUtil');

const self = module.exports = {

  transform: function(activity) {
    // TODO support more reaction types ?
    if (activity.react_type !== 'like') {
      throw boom.badData(`Unsupported reaction type: ${activity.react_type}`);
    }

    let statement = new TinCan.Statement({

      verb: {
        id: 'https://w3id.org/xapi/acrossx/verbs/liked',
        display: {
          en: 'liked',
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
