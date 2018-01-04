'use strict';

const boom = require('boom');

const TinCan = require('tincanjs');
const Microservices = require('../../configs/microservices');

//var like = require('like')

const self = module.exports = {

  transform: function(activity) {

    // TODO support more reaction types ?
    if (activity.activity_type !== 'edit') {
      throw boom.badData(`Unsupported reaction type: ${activity.activity_type}`);
    }

    let statement = new TinCan.Statement({

      verb: {
        id: 'https://w3id.org/xapi/acrossx/verbs/edited',
        display: {
          en: 'edited',
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
