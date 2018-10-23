'use strict';

const Microservices = require('../configs/microservices');

const self = module.exports = {

  prepareStatement: function (activity) {
    let statementCfg = {
      actor: self.actor(activity.user),
      object: self.object(activity),
      context: self.context(activity)
    };
    return statementCfg;
  },

  actor: function(user) {
    return {
      objectType: 'Agent',

      // TODO Investigate how LRS can manage anonymous data (unregistered users)

      // TODO should users be able to select whether their account is shown here or not ?
      // mbox_sha1sum: user.mbox_sha1,

      account: {
        homePage : Microservices.platform.uri,
        name: user.username,
      },

    };
  },

  object: function (activity) {
    return {
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
    };
  },

  context: function(activity) {
    let context = {
      language: activity.content.language,
    };

    let tags = activity.content.tags;
    if (tags && tags.length > 0) {
      let categories = tags.map((tag) => {
        return {
          id: `${Microservices.platform.uri}/deckfamily/${tag.tagName}`,
          objectType: 'Activity',
          definition: {
            name: {
              en: tag.defaultName
            },
            type: 'http://id.tincanapi.com/activitytype/tag',
          },
        };
      });
      context.contextActivities = {
        category: categories,
        parent: [{
          objectType: 'Activity',
          id: ${Microservices.platform.uri}/deck/${activity.content_root_id}
        }]
      };

    }
    return context;
  },

};
