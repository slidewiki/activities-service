'use strict';

const TinCan = require('tincanjs');
const Microservices = require('../../configs/microservices');

const xapi = require('../xapiUtil');

const self = module.exports = {

  transform: function(activity) {
    let deleted = activity.delete_info;
    let platformPath = deleted.content_kind === 'deck' ? 'deck' : 'slideview';

    let statement = new TinCan.Statement({

      verb: {
        id: 'https://brindlewaye.com/xAPITerms/verbs/removed',
        display: {
          en: 'deleted',
        },
      },

      actor: xapi.actor(activity.user),

      object: {
        id: `${Microservices.platform.uri}/${platformPath}/${deleted.content_id}`,
        definition: {
          name: {
            en: deleted.content_name,
          },
          description: {
            en: deleted.content_name,
          },
        },
      },

    });

    return statement;
  },

};
