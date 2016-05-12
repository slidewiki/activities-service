/*
These are routes as defined in https://docs.google.com/document/d/1337m6i7Y0GPULKLsKpyHR4NRzRwhoxJnAZNnDFCigkc/edit#
Each route implementes a basic parameter/payload validation and a swagger API documentation description
*/
'use strict';

const Joi = require('joi'),
  handlers = require('./controllers/handler');

module.exports = function(server) {
  //Get activities with content id id from database and return the entire list (when not available, return NOT FOUND). Validate id
  server.route({
    method: 'GET',
    path: '/activities/{id}',
    handler: handlers.getActivities,
    config: {
      validate: {
        params: {
          id: Joi.string().alphanum().lowercase()
        },
      },
      tags: ['api'],
      description: 'Get a list of activities (example id: 112233445566778899000671; id:000000000000000000000000 recreates mockup data)'
    }
  });

  //Get limited number of activities with content id id from database and return the entire list (when not available, return NOT FOUND). Validate id
  server.route({
    method: 'GET',
    path: '/activities/{id}/more/{start}/{limit}',
    handler: handlers.getActivitiesLimited,
    config: {
      validate: {
        params: {
          id: Joi.string().alphanum().lowercase(),
          start: Joi.number().integer().min(0),
          limit: Joi.number().integer().min(1)
        },
      },
      tags: ['api'],
      description: 'Get a list of {limit} activities starting from {start} )'
    }
  });

  //Get activity with id id from database and return it (when not available, return NOT FOUND). Validate id
  server.route({
    method: 'GET',
    path: '/activity/{id}',
    handler: handlers.getActivity,
    config: {
      validate: {
        params: {
          id: Joi.string().alphanum().lowercase()
        },
      },
      tags: ['api'],
      description: 'Get the activity'
    }
  });

  //Create new activity (by payload) and return it (...). Validate payload
  server.route({
    method: 'POST',
    path: '/activity/new',
    handler: handlers.newActivity,
    config: {
      validate: {
        payload: Joi.object().keys({
          activity_type: Joi.string(),
          user_id: Joi.string().alphanum().lowercase(),
          content_id: Joi.string().alphanum().lowercase(),
          content_kind: Joi.string().valid('deck', 'slide')
        }).requiredKeys('content_id', 'user_id', 'activity_type'),
      },
      tags: ['api'],
      description: 'Create a new activity'
    }
  });

  //Update activity with id id (by payload) and return it (...). Validate payload
  server.route({
    method: 'PUT',
    path: '/activity/{id}',
    handler: handlers.updateActivity,
    config: {
      validate: {
        params: {
          id: Joi.string().alphanum().lowercase()
        },
        payload: Joi.object().keys({
          activity_type: Joi.string(),
          user_id: Joi.string().alphanum().lowercase(),
          content_id: Joi.string().alphanum().lowercase(),
          content_kind: Joi.string().valid('deck', 'slide')
        }).requiredKeys('content_id', 'user_id', 'activity_type'),
      },
      tags: ['api'],
      description: 'Replace an activity'
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
          id: Joi.string().alphanum().lowercase()
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
          content_id: Joi.string().alphanum().lowercase()
        },
      },
      tags: ['api'],
      description: 'Delete all activities for the content (example id: 112233445566778899000671)'
    }
  });
};
