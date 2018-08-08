'use strict';

const Microservices = require('../../configs/microservices');
const xapi = require('../xapiUtil');

module.exports = {

  prepareStatement: function (activity) {
    let statementCfg = {
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
          type: activity.content_kind === 'deck' ? 'http://id.tincanapi.com/activitytype/slide-deck' : 'http://id.tincanapi.com/activitytype/slide',
        },
      },
      context: {
        language: activity.content.language,
      },
    };

    return statementCfg;
  },

};
