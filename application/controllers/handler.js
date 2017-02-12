/*
Handles the requests by executing stuff and replying to the client. Uses promises to get stuff done.
*/

'use strict';

const boom = require('boom'), //Boom gives us some predefined http codes and proper responses
  activitiesDB = require('../database/activitiesDatabase'), //Database functions specific for activities
  co = require('../common');

const Microservices = require('../configs/microservices');
// let http = require('http');
let rp = require('request-promise-native');

//Send request to insert new notification
function createNotification(activity) {
  //TODO find list of subscribed users
  // if (activity.content_id.split('-')[0] === '8') {//current dummy user is subscribed to this content_id


  let notification = {
    activity_type: activity.activity_type,
    user_id: activity.user_id,
    content_id: activity.content_id,
    content_kind: activity.content_kind,
    content_name: activity.content_name,
    content_owner_id: activity.content_owner_id,
    translation_info: activity.translation_info,
    share_info: activity.share_info,
    comment_info: activity.comment_info,
    use_info: activity.use_info,
    react_type: activity.react_type,
    rate_type:  activity.rate_type
  };
  notification.subscribed_user_id = activity.content_owner_id;
  notification.activity_id = activity.id;

  let data = JSON.stringify(notification);

  rp.post({uri: Microservices.notification.uri + '/notification/new', body:data}).then((res) => {
    console.log('Res', res);


    // callback(null, {activities: activities, selector: selector, hasMore: (activities.length === 30)});
  }).catch((err) => {
    console.log('Error', err);

    // callback(null, {activities: [], selector: selector, hasMore: false});
  });


  // let options = {
  //   host: Microservices.notification.uri,
  //   port: 80,
  //   path: '/notification/new',
  //   method: 'POST',
  //   headers : {
  //     'Content-Type': 'application/json',
  //     'Cache-Control': 'no-cache',
  //     'Content-Length': data.length
  //   }
  // };

  // let req = http.request(options, (res) => {
  //   // console.log('STATUS: ' + res.statusCode);
  //   // console.log('HEADERS: ' + JSON.stringify(res.headers));
  //   res.setEncoding('utf8');
  //   res.on('data', (chunk) => {
  //     // console.log('Response: ', chunk);
  //   });
  // });
  // req.on('error', (e) => {
  //   console.log('problem with request: ' + e.message);
  // });
  // req.write(data);
  // req.end();
}

module.exports = {
  //Get Activity from database or return NOT FOUND
  getActivity: function(request, reply) {
    return activitiesDB.get(encodeURIComponent(request.params.id)).then((activity) => {
      if (co.isEmpty(activity))
        reply(boom.notFound());
      else {
        return insertAuthor(activity).then((activity) => {

          reply(co.rewriteID(activity));
        }).catch((error) => {
          tryRequestLog(request, 'error', error);
          reply(boom.badImplementation());
        });
      }
    }).catch((error) => {
      tryRequestLog(request, 'error', error);
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
          activity = co.rewriteID(activity);
          createNotification(activity);
          reply(activity);
        }).catch((error) => {
          tryRequestLog(request, 'error', error);
          reply(boom.badImplementation());
        });
      }
    }).catch((error) => {
      tryRequestLog(request, 'error', error);
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
      tryRequestLog(request, 'error', error);
      reply(boom.badImplementation());
    });
  },

  //Delete Activity with id id
  deleteActivity: function(request, reply) {
    return activitiesDB.delete(encodeURIComponent(request.payload.id)).then(() =>
      reply({'msg': 'activity is successfully deleted...'})
    ).catch((error) => {
      tryRequestLog(request, 'error', error);
      reply(boom.badImplementation());
    });
  },

  //Delete Activities with content id id
  deleteActivities: function(request, reply) {
    return activitiesDB.deleteAllWithContentID(encodeURIComponent(request.payload.content_id)).then(() =>
      reply({'msg': 'activities are successfully deleted...'})
    ).catch((error) => {
      tryRequestLog(request, 'error', error);
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
            let promise = insertAuthor(activity);
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
            tryRequestLog(request, 'error', error);
            reply(boom.badImplementation());
          });
        }).catch((error) => {
          tryRequestLog(request, 'error', error);
          reply(boom.badImplementation());
        });
    }).catch((error) => {
      tryRequestLog(request, 'error', error);
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
  //           tryRequestLog(request, 'error', error);
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
  //         tryRequestLog(request, 'error', error);
  //         reply(boom.badImplementation());
  //       });
  //
  //     })).catch((error) => {
  //       tryRequestLog(request, 'error', error);
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
          let promise = insertAuthor(activity);
          arrayOfAuthorPromisses.push(promise);
        });

        Promise.all(arrayOfAuthorPromisses).then(() => {
          let jsonReply = JSON.stringify(activities);
          reply(jsonReply);

        }).catch((error) => {
          tryRequestLog(request, 'error', error);
          reply(boom.badImplementation());
        });

      }).catch((error) => {
        tryRequestLog(request, 'error', error);
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
          let promise = insertAuthor(activity);
          arrayOfAuthorPromisses.push(promise);
        });

        Promise.all(arrayOfAuthorPromisses).then(() => {
          let jsonReply = JSON.stringify(activities);
          reply(jsonReply);

        }).catch((error) => {
          tryRequestLog(request, 'error', error);
          reply(boom.badImplementation());
        });

      }).catch((error) => {
        tryRequestLog(request, 'error', error);
        reply(boom.badImplementation());
      });
  }
};

//Delete all and insert mockup data
// function initMockupData(identifier) {
//   if (identifier === '000000000000000000000000') {//create collection, delete all and insert mockup data only if the user has explicitly sent 000000000000000000000000
//     return activitiesDB.createCollection()
//       .then(() => activitiesDB.deleteAll())
//       .then(() => insertMockupData());
//   }
//   return new Promise((resolve) => {resolve (1);});
// }

// function getRandomActivities(activities, numActivities) {
//
//   let randomActivities = [];
//   for (let i=0; i<numActivities; i++) {
//     const randomIndex = Math.floor(Math.random()*1000) % activities.length;
//     let a = JSON.parse(JSON.stringify(activities[randomIndex]));//clone it
//     a.id = randomActivities.length;
//     a.content_name = a.content_name + ' (random)';
//     randomActivities.push(a);
//   }
//   return randomActivities;
// }

function getSubdecksAndSlides(content_kind, id) {
  let myPromise = new Promise((resolve, reject) => {
    if (content_kind === 'slide') {
      resolve([{
        type: content_kind,
        id: id
      }]);
    } else {//if deck => get activities of all its decks and slides
      let arrayOfSubdecksAndSlides = [];
      rp.get({uri: Microservices.deck.uri +  '/decktree/' + id}).then((res) => {
        console.log('Res', res);

        try {
          let parsed = JSON.parse(res);
          arrayOfSubdecksAndSlides = getArrayOfChildren(parsed);
        } catch(e) {
          console.log(e); // error in the above string (in this case, yes)!
        }
        // if (res.statusCode === 200) {//user is found
        //   let parsed = JSON.parse(res);
        //   username = parsed.username;
        //   avatar = parsed.picture;
        // }


        resolve(arrayOfSubdecksAndSlides);


        // callback(null, {activities: activities, selector: selector, hasMore: (activities.length === 30)});
      }).catch((err) => {
        console.log('Error', err);

        resolve(arrayOfSubdecksAndSlides);
        // callback(null, {activities: [], selector: selector, hasMore: false});
      });
    }
  });

  // let myPromise = new Promise((resolve, reject) => {
  //   if (content_kind === 'slide') {
  //     resolve([{
  //       type: content_kind,
  //       id: id
  //     }]);
  //   } else {//if deck => get activities of all its decks and slides
  //     let arrayOfSubdecksAndSlides = [];
  //     let options = {
  //       host: Microservices.deck.uri,
  //       port: 80,
  //       path: '/decktree/' + id
  //     };
  //
  //     let req = http.get(options, (res) => {
  //
  //       // console.log('HEADERS: ' + JSON.stringify(res.headers));
  //       res.setEncoding('utf8');
  //       let body = '';
  //       res.on('data', (chunk) => {
  //         // console.log('Response: ', chunk);
  //         body += chunk;
  //       });
  //       res.on('end', () => {
  //         if (res.statusCode === 200) {//deck found
  //           let parsed = JSON.parse(body);
  //           arrayOfSubdecksAndSlides = getArrayOfChildren(parsed);
  //         }
  //         resolve(arrayOfSubdecksAndSlides);
  //       });
  //
  //     });
  //     req.on('error', (e) => {
  //       console.log('problem with request: ' + e.message);
  //       reject(e);
  //     });
  //   }
  // });
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


    let username = 'unknown';
    let avatar = '';
    rp.get({uri: Microservices.user.uri + '/user/' + activity.user_id}).then((res) => {
      console.log('Res', res);

      try {
        let parsed = JSON.parse(res);
        username = parsed.username;
        avatar = parsed.picture;
      } catch(e) {
        console.log(e); // error in the above string (in this case, yes)!
      }
      // if (res.statusCode === 200) {//user is found
      //   let parsed = JSON.parse(res);
      //   username = parsed.username;
      //   avatar = parsed.picture;
      // }

      activity.author = {
        id: activity.user_id,
        username: username,
        avatar: avatar
      };
      resolve(activity);






      // callback(null, {activities: activities, selector: selector, hasMore: (activities.length === 30)});
    }).catch((err) => {
      console.log('Error', err);
      activity.author = {
        id: activity.user_id,
        username: username,
        avatar: avatar
      };
      resolve(activity);
      // callback(null, {activities: [], selector: selector, hasMore: false});
    });
  });

// let myPromise = new Promise((resolve, reject) => {
//
//     let options = {
//       host: Microservices.user.uri,
//       port: 80,
//       path: '/user/' + activity.user_id
//     };
//
//     let req = http.get(options, (res) => {
//       // console.log('HEADERS: ' + JSON.stringify(res.headers));
//       res.setEncoding('utf8');
//       let body = '';
//       res.on('data', (chunk) => {
//         // console.log('Response: ', chunk);
//         body += chunk;
//       });
//       res.on('end', () => {
//         let username = 'unknown';
//         let avatar = '';
//         if (res.statusCode === 200) {//user is found
//           let parsed = JSON.parse(body);
//           username = parsed.username;
//           avatar = parsed.picture;
//         }
//         activity.author = {
//           id: activity.user_id,
//           username: username,
//           avatar: avatar
//         };
//         resolve(activity);
//       });
//     });
//     req.on('error', (e) => {
//       console.log('problem with request: ' + e.message);
//       reject(e);
//     });
//   });

  return myPromise;
}

//This function tries to use request log and uses console.log if this doesnt work - this is the case in unit tests
function tryRequestLog(request, message, _object) {
  try {
    request.log(message, _object);
  } catch (e) {
    console.log(message, _object);
  }
}
