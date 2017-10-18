/*
These are routes as defined in https://docs.google.com/document/d/1337m6i7Y0GPULKLsKpyHR4NRzRwhoxJnAZNnDFCigkc/edit#
Each route implementes a basic parameter/payload validation and a swagger API documentation description
*/
'use strict';

const Joi = require('joi'),
  handlers = require('./controllers/handler');

const fanout = require('./controllers/fanout');

module.exports = function(server) {
  //Get activities with content id id from database and return the entire list (when not available, return NOT FOUND). Validate id
  server.route({
    method: 'GET',
    path: '/activities/{content_kind}/{id}',
    handler: handlers.getActivities,
    config: {
      validate: {
        params: {
          content_kind: Joi.string().valid('deck', 'slide'),
          id: Joi.string().description('The id of the deck/slide')
        },
        query: {
          metaonly: Joi.string().description('Set to true to return only metadata without the list of activities'),
          activity_type: Joi.string().description('Type of activities to be found'),
          all_revisions: Joi.string().description('Set to true to search for activities regardles of the content revision'),
          start: Joi.string().description('If defined, return activities starting from this index'),
          limit: Joi.string().description('If defined, return only this number of activities')
        }
      },
      tags: ['api'],
      description: 'Get a list of activities'
    }
  });

  //Get activities of specific type with content id id from database and return the entire list (when not available, return NOT FOUND). Validate id
  server.route({
    method: 'GET',
    path: '/activities/{activity_type}/{content_kind}/{id}',
    handler: handlers.getActivitiesOfType,
    config: {
      validate: {
        params: {
          activity_type: Joi.string().description('Type of the activity: translate, share, add, edit, comment, reply, use, react, rate, download, fork, delete, joined, left'),
          content_kind: Joi.string().valid('deck', 'slide'),
          id: Joi.string().description('The id of the deck/slide')
        },
      },
      tags: ['api'],
      description: 'Get a list of activities of specified type'
    }
  });

  //Get activities of specific type with content id id from database and return the entire list (when not available, return NOT FOUND). Validate id
  server.route({
    method: 'GET',
    path: '/activities/allrevisions/{activity_type}/{content_kind}/{id}',
    handler: handlers.getActivitiesOfTypeAllRevisions,
    config: {
      validate: {
        params: {
          activity_type: Joi.string().description('Type of the activity: translate, share, add, edit, comment, reply, use, react, rate, download, fork, delete, joined, left'),
          content_kind: Joi.string().valid('deck', 'slide'),
          id: Joi.string().description('The id of the deck/slide')
        },
      },
      tags: ['api'],
      description: 'Get a list of activities of specified type'
    }
  });

  //Get the number of activities of specific type with content id id from database
  server.route({
    method: 'GET',
    path: '/activities/allrevisions/count/{activity_type}/{content_kind}/{id}',
    handler: handlers.getActivitiesCountAllRevisions,
    config: {
      validate: {
        params: {
          activity_type: Joi.string().description('Type of the activity: translate, share, add, edit, comment, reply, use, react, rate, download, fork, delete, joined, left'),
          content_kind: Joi.string().valid('deck', 'slide'),
          id: Joi.string().description('The id of the deck/slide')
        },
      },
      tags: ['api'],
      description: 'Get the number of activities of specified type'
    }
  });

  //Get limited number of activities with content_kind and content id from database and return the entire list (when not available, return NOT FOUND). Validate id
  server.route({
    method: 'GET',
    path: '/activities/{content_kind}/{id}/more/{start}/{limit}',
    handler: handlers.getActivities,
    config: {
      validate: {
        params: {
          content_kind: Joi.string().valid('deck', 'slide'),
          id: Joi.string().description('The id of the deck/slide'),
          start: Joi.string(),
          limit: Joi.string()
        },
      },
      tags: ['api'],
      description: 'Get a list of {limit} activities starting from {start} )'
    }
  });

  //Get activities matching subscriptions from database and return the entire list (when not available, return NOT FOUND).
  server.route({
    method: 'GET',
    path: '/activities/subscribed/{subscriptions*}',
    handler: handlers.getActivitiesSubscribed,
    config: {
      tags: ['api'],
      description: 'Get a list of subscribed activities (example parameter: u16/s8) )'
    }
  });//TODO if the url length is critical -> use POST instead?

  //Get activity with id id from database and return it (when not available, return NOT FOUND). Validate id
  // server.route({
  //   method: 'GET',
  //   path: '/activity/{id}',
  //   handler: handlers.getActivity,
  //   config: {
  //     validate: {
  //       params: {
  //         id: Joi.string()
  //         //id: Joi.string().alphanum().lowercase()
  //       },
  //     },
  //     tags: ['api'],
  //     description: 'Get the activity'
  //   }
  // });

  //Create new activity (by payload) and return it (...). Validate payload
  server.route({
    method: 'POST',
    path: '/activity/new',
    handler: handlers.newActivity,
    config: {
      auth: {
        mode: 'optional',
        strategy: 'jwt'
      },
      pre: [
        { method: fanout.forwardActivity },
      ],
      validate: {
        payload: Joi.object().keys({
          activity_type: Joi.string(),
          user_id: Joi.string(),
          content_id: Joi.string(),
          content_kind: Joi.string().valid('deck', 'slide', 'group'),
          content_name: Joi.string(),
          content_owner_id: Joi.string(),
          translation_info: Joi.object().keys({
            content_id: Joi.string(),
            language: Joi.string()
          }),
          share_info: Joi.object().keys({
            // postURI: Joi.string(),
            platform: Joi.string()
          }),
          comment_info: Joi.object().keys({
            comment_id: Joi.string(),
            text: Joi.string()
          }),
          use_info: Joi.object().keys({
            target_id: Joi.string(),
            target_name: Joi.string().allow('')
          }),
          fork_info: Joi.object().keys({
            content_id: Joi.string()
          }),
          delete_info: Joi.object().keys({
            content_id: Joi.string(),
            content_kind: Joi.string().valid('deck', 'slide', 'group'),
            content_name: Joi.string()
          }),
          react_type: Joi.string(),
          rate_type: Joi.string()
        }).requiredKeys('content_id', 'user_id', 'activity_type'),
        headers: Joi.object({
          '----jwt----': Joi.string().description('JWT header provided by /login')
        }).unknown(),
      },
      tags: ['api'],
      description: 'Create a new activity'
    }
  });

  //Create new activities (by payload) and return them (...). Validate payload
  server.route({
    method: 'POST',
    path: '/activities/new',
    handler: handlers.newActivities,
    config: {
      auth: {
        mode: 'optional',
        strategy: 'jwt'
      },
      pre: [
        { method: fanout.forwardActivity },
      ],
      validate: {
        payload: Joi.array().items(
          Joi.object().keys({
            activity_type: Joi.string(),
            user_id: Joi.string(),
            content_id: Joi.string(),
            content_kind: Joi.string().valid('deck', 'slide', 'group'),
            content_name: Joi.string(),
            content_owner_id: Joi.string(),
            translation_info: Joi.object().keys({
              content_id: Joi.string(),
              language: Joi.string()
            }),
            share_info: Joi.object().keys({
              // postURI: Joi.string(),
              platform: Joi.string()
            }),
            comment_info: Joi.object().keys({
              comment_id: Joi.string(),
              text: Joi.string()
            }),
            use_info: Joi.object().keys({
              target_id: Joi.string(),
              target_name: Joi.string()
            }),
            fork_info: Joi.object().keys({
              content_id: Joi.string()
            }),
            delete_info: Joi.object().keys({
              content_id: Joi.string(),
              content_kind: Joi.string().valid('deck', 'slide', 'group'),
              content_name: Joi.string()
            }),
            react_type: Joi.string(),
            rate_type: Joi.string()
          }).requiredKeys('content_id', 'user_id', 'activity_type')
        ),
        headers: Joi.object({
          '----jwt----': Joi.string().description('JWT header provided by /login')
        }).unknown(),
      },
      tags: ['api'],
      description: 'Create new activities'
    }
  });

  //Delete activity with id id (by payload). Validate payload
  server.route({
    method: 'DELETE',
    path: '/activity/delete',
    handler: handlers.deleteActivity,
    config: {
      validate: {
        payload: {
          id: Joi.string()
        },
      },
      tags: ['api'],
      description: 'Delete an activity'
    }
  });

  //Delete activities with content id id (by payload). Validate payload
  server.route({
    method: 'DELETE',
    path: '/activities/delete',
    handler: handlers.deleteActivities,
    config: {
      validate: {
        payload: {
          content_kind: Joi.string().valid('deck', 'slide', 'group'),
          content_id: Joi.string(),
          activity_type: Joi.string(),
          user_id: Joi.string(),
          all_revisions:  Joi.boolean()
        },
      },
      tags: ['api'],
      description: 'Delete all activities for the specified content, type, user'
    }
  });
};
