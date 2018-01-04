'use strict';

const boom = require('boom');

const TinCan = require('tincanjs');
const Microservices = require('../../configs/microservices');

const self = module.exports = {

  transform: function(activity) {
    // TODO support more reaction types ?
    console.log('react.activity.react_type='+activity.react_type);
    if (activity.react_type !== 'like') {
      throw boom.badData(`Unsupported reaction type: ${activity.react_type}`);
    }

    //let userId = activity.userId;
    //console.log('xApi.userId='+userId);
    //console.log('xApi.username='+activity.user.username);
    let statement = new TinCan.Statement({

      verb: {
        id: 'https://w3id.org/xapi/acrossx/verbs/liked',
        display: {
          en: 'liked',
        },
      },

      actor: {
        objectType: 'Agent',
        name: activity.user.username,
        // TODO figure out how to provide authorization from platform to here
        // in order to be able to receive sensitive data ?

        // TODO Investigate how LRS can manage anonymous data (unregistered users)

        // TODO Support more data for LRS to link to account in LRS (after integration)

        // mbox: `mailto:${activity.user.email}`,
        // mbox_sha1sum: SHA1 checksum of user email address
        account: {
          name: activity.user.username,
          homePage : `${Microservices.platform.uri}/user/${activity.user.username}`
        }
      },

      object: {
        id: `${Microservices.platform.uri}/${activity.content_kind}/${activity.content_id}`,
        definition: {
          name: {
            en: activity.content.title,
          },
          description: {
            en: activity.content.description,
          },
        },
      },

    });
    return statement;

  },

};
