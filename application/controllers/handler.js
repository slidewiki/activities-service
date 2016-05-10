/*
Handles the requests by executing stuff and replying to the client. Uses promises to get stuff done.
*/

'use strict';

const boom = require('boom'), //Boom gives us some predefined http codes and proper responses
  activityDB = require('../database/activityDatabase'), //Database functions specific for activities
  co = require('../common');

module.exports = {
  //Get Activity from database or return NOT FOUND
  getActivity: function(request, reply) {
    activityDB.get(encodeURIComponent(request.params.id)).then((activity) => {
      if (co.isEmpty(activity))
        reply(boom.notFound());
      else {
        activity.author = authorsMap.get(activity.user_id);//insert author data
        reply(co.rewriteID(activity));
      }
    }).catch((error) => {

      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Create Activity with new id and payload or return INTERNAL_SERVER_ERROR
  newActivity: function(request, reply) {
    activityDB.insert(request.payload).then((inserted) => {
      //console.log('inserted: ', inserted);
      if (co.isEmpty(inserted.ops) || co.isEmpty(inserted.ops[0]))
        throw inserted;
      else {
        inserted.ops[0].author = authorsMap.get(inserted.ops[0].user_id);//insert author data
        reply(co.rewriteID(inserted.ops[0]));
      }
    }).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Update Activity with id id and payload or return INTERNAL_SERVER_ERROR
  updateActivity: function(request, reply) {
    activityDB.replace(encodeURIComponent(request.params.id), request.payload).then((replaced) => {
      //console.log('updated: ', replaced);
      if (co.isEmpty(replaced.value))
        throw replaced;
      else
        reply(replaced.value);
    }).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Delete Activity with id id
  deleteActivity: function(request, reply) {
    activityDB.delete(encodeURIComponent(request.payload.id)).then(() =>
      reply({'msg': 'activity is successfully deleted...'})
    ).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Delete Activities with content id id
  deleteActivities: function(request, reply) {
    activityDB.deleteAllWithContentID(encodeURIComponent(request.payload.content_id)).then(() =>
      reply({'msg': 'activities are successfully deleted...'})
    ).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Get All Activities from database for the id in the request
  getActivities: function(request, reply) {
    //Clean collection and insert mockup activities - only if request.params.id === 0
    initMockupData(request.params.id)
      .then(() => activityDB.getAll(encodeURIComponent(request.params.id))
      .then((activities) => {
        activities.forEach((activity) => {
          co.rewriteID(activity);
        });

        //sort by timestamp
        activities.sort((activity1, activity2) => {return (activity2.timestamp - activity1.timestamp);});

        activities.forEach((activity) => {
          activity.author = authorsMap.get(activity.user_id);//insert author data
        });

        let jsonReply = JSON.stringify(activities);
        reply(jsonReply);

      })).catch((error) => {
        request.log('error', error);
        reply(boom.badImplementation());
      });

  }
};

//Delete all and insert mockup data
function initMockupData(identifier) {
  if (identifier === '000000000000000000000000') {//create collection, delete all and insert mockup data only if the user has explicitly sent 000000000000000000000000
    return activityDB.createCollection()
      .then(() => activityDB.deleteAll())
      .then(() => insertMockupData());
  }
  return new Promise((resolve) => {resolve (1);});
}

//Insert mockup data to the collection
function insertMockupData() {
  let activity1 = {
    activity_type: 'add',
    content_id: '112233445566778899000671',
    content_kind: 'slide',
    user_id: '112233445566778899000001'
  };
  let ins1 = activityDB.insert(activity1);

  let activity2 = {
    activity_type: 'edit',
    content_id: '112233445566778899000671',
    content_kind: 'slide',
    user_id: '112233445566778899000004'
  };
  let ins2 = ins1.then(() => activityDB.insert(activity2));
  let activity3 = {
    activity_type: 'translate',
    content_id: '112233445566778899000671',
    content_kind: 'slide',
    user_id: '112233445566778899000005'
  };
  let ins3 = ins2.then(() => activityDB.insert(activity3));
  return ins3;
}

let authorsMap = new Map([
  ['112233445566778899000001', {
    id: 7,
    username: 'Vuk M.',
    avatar: '/assets/images/mock-avatars/deadpool_256.png'
  }],
  ['112233445566778899000002', {
    id: 8,
    username: 'Dejan P.',
    avatar: '/assets/images/mock-avatars/man_512.png'
  }],
  ['112233445566778899000003', {
    id: 9,
    username: 'Nikola T.',
    avatar: '/assets/images/mock-avatars/batman_512.jpg'
  }],
  ['112233445566778899000004', {
    id: 10,
    username: 'Marko B.',
    avatar: '/assets/images/mock-avatars/ninja-simple_512.png'
  }],
  ['112233445566778899000005', {
    id: 11,
    username: 'Voice in the crowd',
    avatar: '/assets/images/mock-avatars/anon_256.jpg'
  }],
  ['112233445566778899000006', {
    id: 12,
    username: 'SlideWiki FTW',
    avatar: '/assets/images/mock-avatars/spooky_256.png'
  }]
]);
