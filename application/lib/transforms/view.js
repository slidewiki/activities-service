'use strict';

const boom = require('boom');

const TinCan = require('tincanjs');
const Microservices = require('../../configs/microservices');

//var like = require('like')

const self = module.exports = {

  transform: function(activity) {
    let lang = activity.content.language.replace(/_/g, '-');

    //let userId = activity.userId;
    //console.log('xApi.userId='+userId);
    //console.log('xApi.username='+activity.user.username);
    let statement = new TinCan.Statement({

      verb: {
        id: 'http://adlnet.gov/expapi/verbs/experienced',
        display: {
          en: 'experienced',
        },
      },

      actor: {
        objectType: 'Agent',
        // name: activity.user.username,

        // TODO Investigate how LRS can manage anonymous data (unregistered users)

        // mbox: `mailto:${activity.user.email}`,
        // mbox_sha1sum: activity.user.mbox_sha1,

        account: {
          homePage : Microservices.platform.uri,
          name: String(activity.user.id),
        },

      },

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
