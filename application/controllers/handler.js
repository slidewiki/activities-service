/*
Handles the requests by executing stuff and replying to the client. Uses promises to get stuff done.
*/

'use strict';

const boom = require('boom'), //Boom gives us some predefined http codes and proper responses
  activitiesDB = require('../database/activitiesDatabase'), //Database functions specific for activities
  co = require('../common');

const Microservices = require('../configs/microservices');
let http = require('http');
module.exports = {
  //Get Activity from database or return NOT FOUND
  getActivity: function(request, reply) {
    return activitiesDB.get(encodeURIComponent(request.params.id)).then((activity) => {
      if (co.isEmpty(activity))
        reply(boom.notFound());
      else {
        return insertAuthor(activity).then((activity) => {

          if (activity.user_id.length === 24) {//Mockup - old kind of ids
            activity.author = getMockupAuthor(activity.user_id);
          }
          reply(co.rewriteID(activity));
        }).catch((error) => {
          request.log('error', error);
          reply(boom.badImplementation());
        });
      }
    }).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Create Activity with new id and payload or return INTERNAL_SERVER_ERROR
  newActivity: function(request, reply) {
    return activitiesDB.insert(request.payload).then((inserted) => {
      //console.log('inserted: ', inserted);
      if (co.isEmpty(inserted.ops) || co.isEmpty(inserted.ops[0]))
        throw inserted;
      else {
        return insertAuthor(inserted.ops[0]).then((activity) => {
          reply(co.rewriteID(activity));
        }).catch((error) => {
          request.log('error', error);
          reply(boom.badImplementation());
        });
      }
    }).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Update Activity with id id and payload or return INTERNAL_SERVER_ERROR
  updateActivity: function(request, reply) {
    return activitiesDB.replace(encodeURIComponent(request.params.id), request.payload).then((replaced) => {
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
    return activitiesDB.delete(encodeURIComponent(request.payload.id)).then(() =>
      reply({'msg': 'activity is successfully deleted...'})
    ).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Delete Activities with content id id
  deleteActivities: function(request, reply) {
    return activitiesDB.deleteAllWithContentID(encodeURIComponent(request.payload.content_id)).then(() =>
      reply({'msg': 'activities are successfully deleted...'})
    ).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Get All Activities from database for the content_kind and id in the request, limited by the number of documents
  getActivities: function(request, reply) {
    let content_kind = request.params.content_kind;
    if (content_kind === undefined) {// this is just to serve requests from old front-end version
      content_kind = 'slide';
    }

    return getSubdecksAndSlides(content_kind, request.params.id).then((arrayOfDecksAndSlides) => {
      let slideIdArray = [];
      let deckIdArray = [];

      arrayOfDecksAndSlides.forEach((deckOrSlide) => {
        if (deckOrSlide.type === 'slide') {
          slideIdArray.push(deckOrSlide.id);
        } else {
          deckIdArray.push(deckOrSlide.id);
        }
      });

      return activitiesDB.getAllWithProperties([], slideIdArray, deckIdArray, [])
        .then((activities) => {
          //limit the resuls
          const start = request.params.start;
          const limit = request.params.limit;
          let activitiesLimited = activities;
          if (start !== undefined && limit !== undefined) {
            activitiesLimited = activities.slice(start, start + limit);
          }
          let arrayOfAuthorPromisses = [];
          activitiesLimited.forEach((activity) => {
            co.rewriteID(activity);
            let promise = insertAuthor(activity).then((activity) => {

              if (activity.user_id.length === 24) {//Mockup - old kind of ids
                activity.author = getMockupAuthor(activity.user_id);//insert author data
              }
            }).catch((error) => {
              request.log('error', error);
              reply(boom.badImplementation());
            });
            arrayOfAuthorPromisses.push(promise);
          });

          //add random activities - for demonstration purpose only ;
          // if (start < 200) {
          //   let randomActivities = getRandomActivities(activities, limit - activitiesLimited.length);
          //   activitiesLimited = activitiesLimited.concat(randomActivities);
          // }

          Promise.all(arrayOfAuthorPromisses).then(() => {
            let jsonReply = JSON.stringify(activitiesLimited);
            reply(jsonReply);

          }).catch((error) => {
            request.log('error', error);
            reply(boom.badImplementation());
          });
        }).catch((error) => {
          request.log('error', error);
          reply(boom.badImplementation());
        });
    }).catch((error) => {
      request.log('error', error);
      reply(boom.badImplementation());
    });
  },

  //Get All Activities from database for the content_kind and id in the request
  // getActivities: function(request, reply) { - old version (before getting subactivities)
  //   //Clean collection and insert mockup activities - only if request.params.id === 0
  //   return initMockupData(request.params.id)
  //     // .then(() => activitiesDB.getAllFromCollection()
  //     .then(() => activitiesDB.getAllForDeckOrSlide(content_kind, encodeURIComponent(request.params.id))
  //     .then((activities) => {
  //       let arrayOfAuthorPromisses = [];
  //       activities.forEach((activity) => {
  //         co.rewriteID(activity);
  //         let promise = insertAuthor(activity).then((activity) => {
  //
  //           if (activity.user_id.length === 24) {//Mockup - old kind of ids
  //             activity.author = getMockupAuthor(activity.user_id);//insert author data
  //           }
  //         }).catch((error) => {
  //           request.log('error', error);
  //           reply(boom.badImplementation());
  //         });
  //         arrayOfAuthorPromisses.push(promise);
  //       });
  //
  //       Promise.all(arrayOfAuthorPromisses).then(() => {
  //         let jsonReply = JSON.stringify(activities);
  //         reply(jsonReply);
  //
  //       }).catch((error) => {
  //         request.log('error', error);
  //         reply(boom.badImplementation());
  //       });
  //
  //     })).catch((error) => {
  //       request.log('error', error);
  //       reply(boom.badImplementation());
  //     });
  //
  // },

  //Get All Activities from database for subscriptions in the request
  getActivitiesSubscribed: function(request, reply) {
    const subscriptions = request.params.subscriptions.split('/');
    let userIdArray = [];
    let slideIdArray = [];
    let deckIdArray = [];
    let idArray = [];
    let ownerId = undefined;
    subscriptions.forEach((subscription) => {
      if (subscription.startsWith('u')) {
        userIdArray.push(subscription.substring(1));
      } else if (subscription.startsWith('s')) {
        slideIdArray.push(subscription.substring(1));
      } else if (subscription.startsWith('d')) {
        deckIdArray.push(subscription.substring(1));
      } else if (subscription.startsWith('i')) {
        idArray.push(subscription.substring(1));
      } else if (subscription.startsWith('o')) {
        ownerId = subscription.substring(1);
      }
    });

    return activitiesDB.getAllWithProperties(userIdArray, slideIdArray, deckIdArray, idArray, ownerId)
      .then((activities) => {
        let arrayOfAuthorPromisses = [];
        activities.forEach((activity) => {
          co.rewriteID(activity);
          let promise = insertAuthor(activity).then((activity) => {

            if (activity.user_id.length === 24) {//Mockup - old kind of ids
              activity.author = getMockupAuthor(activity.user_id);//insert author data
            }
          }).catch((error) => {
            request.log('error', error);
            reply(boom.badImplementation());
          });
          arrayOfAuthorPromisses.push(promise);
        });

        Promise.all(arrayOfAuthorPromisses).then(() => {
          let jsonReply = JSON.stringify(activities);
          reply(jsonReply);

        }).catch((error) => {
          request.log('error', error);
          reply(boom.badImplementation());
        });

      }).catch((error) => {
        request.log('error', error);
        reply(boom.badImplementation());
      });
  },

  //Get All Activities from database
  getAllActivities: function(request, reply) {
    return activitiesDB.getAllFromCollection()
      .then((activities) => {
        let arrayOfAuthorPromisses = [];
        activities.forEach((activity) => {
          co.rewriteID(activity);
          let promise = insertAuthor(activity).then((activity) => {

            if (activity.user_id.length === 24) {//Mockup - old kind of ids
              activity.author = getMockupAuthor(activity.user_id);//insert author data
            }
          }).catch((error) => {
            request.log('error', error);
            reply(boom.badImplementation());
          });
          arrayOfAuthorPromisses.push(promise);
        });

        Promise.all(arrayOfAuthorPromisses).then(() => {
          let jsonReply = JSON.stringify(activities);
          reply(jsonReply);

        }).catch((error) => {
          request.log('error', error);
          reply(boom.badImplementation());
        });

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

function getSubdecksAndSlides(content_kind, id) {
  let myPromise = new Promise((resolve, reject) => {
    if (content_kind === 'slide') {
      resolve([{
        type: content_kind,
        id: id
      }]);
    } else {//if deck => get activities of all its decks and slides
      let arrayOfSubdecksAndSlides = [];
      let options = {
        host: Microservices.deck.uri,
        port: 80,
        path: '/decktree/' + id
      };

      let req = http.get(options, (res) => {
        if (res.statusCode === '404') {//deck found
          resolve([]);
        }
        // console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        let body = '';
        res.on('data', (chunk) => {
          // console.log('Response: ', chunk);
          body += chunk;
        });
        res.on('end', () => {
          let parsed = JSON.parse(body);
          arrayOfSubdecksAndSlides = getArrayOfChildren(parsed);
          resolve(arrayOfSubdecksAndSlides);
        });

      });
      req.on('error', (e) => {
        console.log('problem with request: ' + e.message);
        reject(e);
      });
    }
  });
  return myPromise;
}

function getArrayOfChildren(node) {//recursive
  let array = [{
    type: node.type,
    id: node.id
  }];
  if (node.children) {
    node.children.forEach((child) => {
      array = array.concat(getArrayOfChildren(child));
    });
  }
  return array;
}

//insert author data using user microservice
function insertAuthor(activity) {
  let myPromise = new Promise((resolve, reject) => {

    let options = {
      host: Microservices.user.uri,
      port: 80,
      path: '/user/' + activity.user_id
    };

    let req = http.get(options, (res) => {
      if (res.statusCode === '404') {//user not found
        activity.author = {
          id: activity.user_id,
          username: 'unknown',
          avatar: ''
        };
        resolve(activity);
      }
      // console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      let body = '';
      res.on('data', (chunk) => {
        // console.log('Response: ', chunk);
        body += chunk;
      });
      res.on('end', () => {
        let parsed = JSON.parse(body);
        activity.author = {
          id: activity.user_id,
          username: parsed.username,
          avatar: parsed.picture
        };
        resolve(activity);
      });
    });
    req.on('error', (e) => {
      console.log('problem with request: ' + e.message);
      reject(e);
    });
  });

  return myPromise;
}

function getMockupAuthor(userId) {
  let author = authorsMap.get(userId);//insert author data
  if (author === undefined) {
    author = authorsMap.get('112233445566778899000000');
  }
  return author;
}

//Insert mockup data to the collection
function insertMockupData() {
  let activity1 = {
    activity_type: 'add',
    content_id: '8',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000004'
  };
  let ins1 = activitiesDB.insert(activity1);
  let activity2 = {
    activity_type: 'edit',
    content_id: '9',
    content_kind: 'deck',
    content_name: 'Collaborative authoring of presentations',
    user_id: '112233445566778899000002'
  };
  let ins2 = ins1.then(() => activitiesDB.insert(activity2));
  let activity3 = {
    activity_type: 'translate',
    content_id: '8',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000002',
    translation_info: {
      content_id: '42',
      language: 'Serbian'
    }
  };
  let ins3 = ins2.then(() => activitiesDB.insert(activity3));
  let activity4 = {
    activity_type: 'translate',
    content_id: '8',
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
    content_id: '8',
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
    content_id: '9',
    content_kind: 'deck',
    content_name: 'Collaborative authoring of presentations',
    user_id: '112233445566778899000001',
    share_info: {
      postURI: 'http://facebook.com',
      platform: 'Facebook'
    }
  };
  let ins6 = ins5.then(() => activitiesDB.insert(activity6));
  let activity7 = {
    activity_type: 'comment',
    content_id: '8',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000003',
    comment_info: {
      comment_id: '112233445566778899000042',
      text: 'Awesome!'
    }
  };
  let ins7 = ins6.then(() => activitiesDB.insert(activity7));
  let activity8 = {
    activity_type: 'reply',
    content_id: '8',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000003',
    comment_info: {
      comment_id: '112233445566778899000043',
      text: 'Indeed'
    }
  };
  let ins8 = ins7.then(() => activitiesDB.insert(activity8));
  let activity9 = {
    activity_type: 'use',
    content_id: '8',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000002',
    use_info: {
      target_id: '53',
      target_name: 'Slidewiki Introduction'
    }
  };
  let ins9 = ins8.then(() => activitiesDB.insert(activity9));
  let activity10 = {
    activity_type: 'react',
    content_id: '8',
    content_kind: 'slide',
    content_name: 'Introduction',
    user_id: '112233445566778899000002',
    react_type: 'like'
  };
  let ins10 = ins9.then(() => activitiesDB.insert(activity10));
  let activity11 = {
    activity_type: 'download',
    content_id: '8',
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
    username: 'Dejan P.',
    avatar: '/assets/images/mock-avatars/deadpool_256.png'
  }],
  ['112233445566778899000002', {
    id: 8,
    username: 'Nikola T.',
    avatar: '/assets/images/mock-avatars/man_512.png'
  }],
  ['112233445566778899000003', {
    id: 9,
    username: 'Marko B.',
    avatar: '/assets/images/mock-avatars/batman_512.jpg'
  }],
  ['112233445566778899000004', {
    id: 10,
    username: 'Valentina J.',
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
