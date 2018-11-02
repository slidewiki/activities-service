'use strict';

const Microservices = require('../configs/microservices');
const util = require('./util');

const self = module.exports = {

  prepareStatement: function (activity) {
    let statementCfg = {
      actor: self.actor(activity.user),
      object: self.object(activity),
      context: self.context(activity)
    };

    if (activity.timestamp) {
      statementCfg.timestamp = activity.timestamp;
    }

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
    let id = Microservices.platform.uri;
    if (activity.content_root_id) {
      id += `/deck/${activity.content_root_id}`;
    }
    id += `/${activity.content_kind}/${activity.content_id}`;

    return {
      id,
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

    let categories, parents;

    // read tags from path if available, otherwise just the tags
    let tags = activity.content.pathTags || activity.content.tags;
    if (tags && tags.length > 0) {
      categories = tags.map((tag) => {
        return {
          id: `${Microservices.platform.uri}/deckfamily/${tag.tagName}`,
          objectType: 'Activity',
          definition: {
            name: {
              en: tag.defaultName || tag.tagName,
            },
            type: 'http://id.tincanapi.com/activitytype/tag',
          },
        };
      });
    }

    let rootRef = util.parseIdentifier(activity.content_root_id);
    if (rootRef) {
      parents = [{
        id: `${Microservices.platform.uri}/deck/${rootRef.id}`,
        objectType: 'Activity',
        definition: {
          type: 'http://id.tincanapi.com/activitytype/slide-deck',
          extensions: {
            'http://schema.org/version': rootRef.revision,
          },
        },
      }];
    }

    if (categories || parents) {
      context.contextActivities = {};
      if (categories) {
        context.contextActivities.category = categories;
      }
      if (parents) {
        context.contextActivities.parent = parents;
      }
    }

    return context;
  },

};
