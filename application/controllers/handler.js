/*
Handles the requests by executing stuff and replying to the client. Uses promises to get stuff done.
*/

'use strict';

const boom = require('boom'), //Boom gives us some predefined http codes and proper responses
  activitiesDB = require('../database/activitiesDatabase'), //Database functions specific for activities
  co = require('../common');

module.exports = {
  //Get Activity from database or return NOT FOUND
  getActivity: function(request, reply) {
    activitiesDB.get(encodeURIComponent(request.params.id)).then((activity) => {
      if (co.isEmpty(activity))
        reply(boom.notFound());
      else {
        activity.author = authorsMap.get(activity.user_id);//insert author data
        if (activity.author === undefined) {
          activity.author = authorsMap.get('112233445566778899000000');
        }
        reply(co.rewriteID(activity));
      }
    }).catch((error) => {

      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Create Activity with new id and payload or return INTERNAL_SERVER_ERROR
  newActivity: function(request, reply) {
    activitiesDB.insert(request.payload).then((inserted) => {
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
    activitiesDB.replace(encodeURIComponent(request.params.id), request.payload).then((replaced) => {
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
    activitiesDB.delete(encodeURIComponent(request.payload.id)).then(() =>
      reply({'msg': 'activity is successfully deleted...'})
    ).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Delete Activities with content id id
  deleteActivities: function(request, reply) {
    activitiesDB.deleteAllWithContentID(encodeURIComponent(request.payload.content_id)).then(() =>
      reply({'msg': 'activities are successfully deleted...'})
    ).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Get All Activities from database for the id in the request, limited by the number of documents
  getActivitiesLimited: function(request, reply) {
    activitiesDB.getAll(encodeURIComponent(request.params.id))
      .then((activities) => {

        //limit the resuls
        const start = request.params.start;
        const limit = request.params.limit;
        let activitiesLimited = activities.slice(start, start + limit);
        activities.forEach((activity) => {
          co.rewriteID(activity);

          activity.author = authorsMap.get(activity.user_id);//insert author data
        });

        //add random activities - for demonstration purpose only ; TODO remove addRandomActivities
        if (start < 200) {
          let randomActivities = getRandomActivities(activities, limit - activitiesLimited.length);
          activitiesLimited = activitiesLimited.concat(randomActivities);
        }

        let jsonReply = JSON.stringify(activitiesLimited);
        reply(jsonReply);

      }).catch((error) => {
        request.log('error', error);
        reply(boom.badImplementation());
      });

      //TODO get activities for a deck (activities of all its decks and slides)
  },

  //Get All Activities from database for the id in the request
  getActivities: function(request, reply) {
    //Clean collection and insert mockup activities - only if request.params.id === 0
    initMockupData(request.params.id)
      .then(() => activitiesDB.getAllFromCollection()//TODO call getAll(identifier)
      // .then(() => activitiesDB.getAll(encodeURIComponent(request.params.id))
      .then((activities) => {
        activities.forEach((activity) => {
          co.rewriteID(activity);
          activity.author = authorsMap.get(activity.user_id);//insert author data
        });

        let jsonReply = JSON.stringify(activities);
        reply(jsonReply);

      })).catch((error) => {
        request.log('error', error);
        reply(boom.badImplementation());
      });

      //TODO get activities for a deck (activities of all its decks and slides)
  },

  //Get All Activities from database
  getAllActivities: function(request, reply) {
    activitiesDB.getAllFromCollection()
      .then((activities) => {
        activities.forEach((activity) => {
          co.rewriteID(activity);
          activity.author = authorsMap.get(activity.user_id);//insert author data
        });

        let jsonReply = JSON.stringify(activities);
        reply(jsonReply);

      }).catch((error) => {
        request.log('error', error);
        reply(boom.badImplementation());
      });
  }
};

//Delete all and insert mockup data
function initMockupData(identifier) {
  if (identifier === '000000000000000000000000') {//create collection, delete all and insert mockup data only if the user has explicitly sent 000000000000000000000000
    return activitiesDB.createCollection()
      .then(() => activitiesDB.deleteAll())
      .then(() => insertMockupData());
  }
  return new Promise((resolve) => {resolve (1);});
}

function getRandomActivities(activities, numActivities) {

  let randomActivities = [];
  for (let i=0; i<numActivities; i++) {
    const randomIndex = Math.floor(Math.random()*1000) % activities.length;
    let a = JSON.parse(JSON.stringify(activities[randomIndex]));//clone it
    a.id = randomActivities.length;
    a.content_name = a.content_name + ' (random)';
    randomActivities.push(a);
  }
  return randomActivities;
}

//Insert mockup data to the collection
function insertMockupData() {
  let activity1 = {
    activity_type: 'add',
    content_id: '112233445566778899000671',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000004'
  };
  let ins1 = activitiesDB.insert(activity1);
  let activity2 = {
    activity_type: 'edit',
    content_id: '112233445566778899000067',
    content_kind: 'deck',
    content_name: 'RDF Data Model',
    user_id: '112233445566778899000002'
  };
  let ins2 = ins1.then(() => activitiesDB.insert(activity2));
  let activity3 = {
    activity_type: 'translate',
    content_id: '112233445566778899000671',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000001',
    translation_info: {
      content_id: '42',
      language: 'Serbian'
    }
  };
  let ins3 = ins2.then(() => activitiesDB.insert(activity3));
  let activity4 = {
    activity_type: 'translate',
    content_id: '112233445566778899000671',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000001',
    translation_info: {
      content_id: '43',
      language: 'Bosnian'
    }
  };
  let ins4 = ins3.then(() => activitiesDB.insert(activity4));
  let activity5 = {
    activity_type: 'translate',
    content_id: '112233445566778899000671',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000001',
    translation_info: {
      content_id: '44',
      language: 'Croatian'
    }
  };
  let ins5 = ins4.then(() => activitiesDB.insert(activity5));
  let activity6 = {
    activity_type: 'share',
    content_id: '112233445566778899000067',
    content_kind: 'deck',
    content_name: 'RDF Data Model',
    user_id: '112233445566778899000001',
    share_info: {
      postURI: 'http://facebook.com',
      platform: 'Facebook'
    }
  };
  let ins6 = ins5.then(() => activitiesDB.insert(activity6));
  let activity7 = {
    activity_type: 'comment',
    content_id: '112233445566778899000671',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000001',
    comment_info: {
      comment_id: '112233445566778899000042',
      text: 'Awesome!'
    }
  };
  let ins7 = ins6.then(() => activitiesDB.insert(activity7));
  let activity8 = {
    activity_type: 'reply',
    content_id: '112233445566778899000671',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000001',
    comment_info: {
      comment_id: '112233445566778899000043',
      text: 'Indeed'
    }
  };
  let ins8 = ins7.then(() => activitiesDB.insert(activity8));
  let activity9 = {
    activity_type: 'use',
    content_id: '112233445566778899000671',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000001',
    use_info: {
      target_id: '53',
      target_name: 'Slidewiki Introduction'
    }
  };
  let ins9 = ins8.then(() => activitiesDB.insert(activity9));
  let activity10 = {
    activity_type: 'react',
    content_id: '112233445566778899000671',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000001',
    react_type: 'like'
  };
  let ins10 = ins9.then(() => activitiesDB.insert(activity10));
  let activity11 = {
    activity_type: 'download',
    content_id: '112233445566778899000671',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000001'
  };
  let ins11 = ins10.then(() => activitiesDB.insert(activity11));

  return ins11;
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
  }],
  ['112233445566778899000000', {
    id: 13,
    username: 'Dutch',
    avatar: '/assets/images/mock-avatars/dgirl.jpeg'
  }]
]);
