/*
These are routes as defined in https://docs.google.com/document/d/1337m6i7Y0GPULKLsKpyHR4NRzRwhoxJnAZNnDFCigkc/edit#
Each route implementes a basic parameter/payload validation and a swagger API documentation description
*/
'use strict';

const Joi = require('joi'),
  handlers = require('./controllers/handler'),
  followHandlers = require('./controllers/followHandler');

const fanout = require('./controllers/fanout');

module.exports = function(server) {

  //Count activities of certain type, group by deck/slide ids and return max
  server.route({
    method: 'GET',
    path: '/activities/maxCount',
    handler: handlers.getActivitiesMaxCount,
    config: {
      validate: {
        query: {
          activity_type: [Joi.array().items(Joi.string()), Joi.string()],//an array or a single string
          all_revisions: Joi.string().description('Set to true to search for activities regardles of the content revision'),
          limit: Joi.string().description('If defined, return only this number of results'),
          content_kind: [Joi.array().items(Joi.string()), Joi.string()],//an array or a single string
        }
      },
      tags: ['api'],
      description: 'Count activities of certain type, grouped by deck/slide ids and return max results'
    }
  });


  //Get activities with content id id from database and return the entire list (when not available, return NOT FOUND). Validate id
  server.route({
    method: 'GET',
    path: '/activities/{content_kind}/{id}',
    handler: handlers.getActivities,
    config: {
      validate: {
        params: {
          content_kind: Joi.string().valid('deck', 'slide', 'user'),
          id: Joi.string().description('The id of the deck/slide/user')
        },
        query: {
          metaonly: Joi.string().description('Set to true to return only metadata without the list of activities'),
          activity_type: [Joi.array().items(Joi.string()), Joi.string()],//an array or a single string
          include_subdecks_and_slides: Joi.string().description('Set to true to include activities of subdecks and slides'),
          all_revisions: Joi.string().description('Set to true to search for activities regardles of the content revision'),
          start: Joi.string().description('If defined, return activities starting from this index'),
          limit: Joi.string().description('If defined, return only this number of activities')
        }
      },
      tags: ['api'],
      description: 'Get a list of activities'
    }
  });

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
        { method: fanout.processActivity },
      ],
      validate: {
        payload: Joi.object().keys({
          activity_type: Joi.string(),
          user_id: Joi.string(),
          content_id: Joi.string(),
          content_kind: Joi.string().valid('deck', 'slide', 'group'),
          content_name: Joi.string().allow(''),
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
            text: Joi.string(),
            parent_comment_owner_id: Joi.string()
          }),
          use_info: Joi.object().keys({
            target_id: Joi.string(),
            target_name: Joi.string().allow('')
          }),
          exam_info: Joi.object().keys({
            score: Joi.number()
          }),
          fork_info: Joi.object().keys({
            content_id: Joi.string()
          }),
          delete_info: Joi.object().keys({
            content_id: Joi.string(),
            content_kind: Joi.string().valid('deck', 'slide', 'group'),
            content_name: Joi.string().allow('')
          }),
          move_info: Joi.object().keys({
            source_id: Joi.string(),
            target_id: Joi.string()
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
        { method: fanout.processActivity },
      ],
      validate: {
        payload: Joi.array().items(
          Joi.object().keys({
            activity_type: Joi.string(),
            user_id: Joi.string(),
            content_id: Joi.string(),
            content_kind: Joi.string().valid('deck', 'slide', 'group'),
            content_name: Joi.string().allow(''),
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
              text: Joi.string(),
              parent_comment_owner_id: Joi.string()
            }),
            use_info: Joi.object().keys({
              target_id: Joi.string(),
              target_name: Joi.string()
            }),
            exam_info: Joi.object().keys({
              score: Joi.number()
            }),
            fork_info: Joi.object().keys({
              content_id: Joi.string()
            }),
            delete_info: Joi.object().keys({
              content_id: Joi.string(),
              content_kind: Joi.string().valid('deck', 'slide', 'group'),
              content_name: Joi.string().allow('')
            }),
            move_info: Joi.object().keys({
              source_id: Joi.string(),
              target_id: Joi.string()
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

  //Get followings for a type (deck, playlist, user) and id
  server.route({
    method: 'GET',
    path: '/followings/{type}/{id}',
    handler: followHandlers.getFollowings,
    config: {
      validate: {
        params: {
          type: Joi.string().valid('deck', 'slide', 'playlist', 'user'),
          id: Joi.string().description('The id of the deck/slide/playlist/user')
        }
      },
      tags: ['api'],
      description: 'Get a list of followings'
    }
  });

  //Create new following (by payload) and return it (...). Validate payload
  server.route({
    method: 'POST',
    path: '/followings/new',
    handler: followHandlers.newFollowing,
    config: {
      auth: {
        mode: 'optional',
        strategy: 'jwt'
      },
      validate: {
        payload: Joi.object().keys({
          user_id: Joi.string(),
          followed_type: Joi.string(),
          followed_id: Joi.string(),
        }).requiredKeys('user_id', 'followed_type', 'followed_id'),
        headers: Joi.object({
          '----jwt----': Joi.string().description('JWT header provided by /login')
        }).unknown(),
      },
      tags: ['api'],
      description: 'Create a new following'
    }
  });

  //Delete following with id id (by payload). Validate payload
  server.route({
    method: 'DELETE',
    path: '/followings/delete',
    handler: followHandlers.deleteFollowing,
    config: {
      validate: {
        payload: {
          id: Joi.string()
        },
      },
      tags: ['api'],
      description: 'Delete a following'
    }
  });
};
