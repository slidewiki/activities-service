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

  rp.post({uri: Microservices.notification.uri + '/notification/new', body:data})
    .catch((e) => {
      console.log('problem with createNotification: ' + e);
    });
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
    return findContentTitleAndOwnerIfNeeded(request.payload)
      .then((contentTitleAndOwner) => {
        if (contentTitleAndOwner.title !== '') {
          request.payload.content_name = contentTitleAndOwner.title;
          request.payload.content_owner_id = contentTitleAndOwner.ownerId;
          let contentIdParts = request.payload.content_id.split('-');
          if (contentIdParts.length === 1) {//there is no revision id
            request.payload.content_id += '-' + contentTitleAndOwner.revisionId;
          }
        }

        activitiesDB.insert(request.payload).then((inserted) => {
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
      }).catch((error) => {
        tryRequestLog(request, 'error', error);
        reply(boom.badImplementation());
      });
  },

  //Create Activities with new ids and payload or return INTERNAL_SERVER_ERROR
  newActivities: function(request, reply) {
    let activities = request.payload;
    let arrayOfPromises = [];
    activities.forEach((activity) => {
      let promise = findContentTitleAndOwnerIfNeeded(activity);
      arrayOfPromises.push(promise);
    });

    return Promise.all(arrayOfPromises)
      .then((activities) => {
        activitiesDB.insertArray(activities).then((inserted) => {
          //console.log('inserted: ', inserted);
          if (co.isEmpty(inserted.ops) || co.isEmpty(inserted.ops[0]))
            throw inserted;
          else {
            let arrayOfAuthorPromises = [];
            inserted.ops.forEach((activity) => {
              let promise = insertAuthor(activity);
              arrayOfAuthorPromises.push(promise);
            });
            return Promise.all(arrayOfAuthorPromises)
              .then((activities) => {
                activities.forEach((activity) => {
                  activity = co.rewriteID(activity);
                  createNotification(activity);
                });
                reply(activities);
              }).catch((error) => {
                tryRequestLog(request, 'error', error);
                reply(boom.badImplementation());
              });
          }
        }).catch((error) => {
          tryRequestLog(request, 'error', error);
          reply(boom.badImplementation());
        });
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

  //Delete Activities with content , type, and user
  deleteActivities: function(request, reply) {
    const content_kind = (request.payload.content_kind) ? encodeURIComponent(request.payload.content_kind) : undefined;
    let content_id = (request.payload.content_id) ? encodeURIComponent(request.payload.content_id) : undefined;
    const activity_type = (request.payload.activity_type) ? encodeURIComponent(request.payload.activity_type) : undefined;
    const user_id = (request.payload.user_id) ? encodeURIComponent(request.payload.user_id) : undefined;

    if (request.payload.all_revisions !== undefined && request.payload.all_revisions === true) {
      content_id = new RegExp('^' + content_id.split('-')[0]);
    }
    return activitiesDB.deleteAllWithContentTypeUser(content_kind, content_id, activity_type, user_id).then(() =>
      reply({'msg': 'activities are successfully deleted...'})
    ).catch((error) => {
      tryRequestLog(request, 'error', error);
      reply(boom.badImplementation());
    });
  },

  //Get All Activities from database for the content_kind and id in the request, limited by the number of documents
  //In case of a deck -  include its subdecks and slides
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

  //Get All Activities of specified type from database for the content_kind and id in the request
  getActivitiesOfType: function(request, reply) {
    let content_kind = request.params.content_kind;
    let activity_type = request.params.activity_type;
    let content_id = request.params.id;

    return activitiesDB.getAllOfTypeForDeckOrSlide(activity_type, content_kind, content_id)
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

  //Get All Activities of specified type from database for the content_kind and id (all revisions) in the request
  getActivitiesOfTypeAllRevisions: function(request, reply) {
    let content_kind = request.params.content_kind;
    let activity_type = request.params.activity_type;
    let content_id = new RegExp('^' + request.params.id.split('-')[0]);

    return activitiesDB.getAllOfTypeForDeckOrSlide(activity_type, content_kind, content_id)
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

        try {
          let parsed = JSON.parse(res);
          arrayOfSubdecksAndSlides = getArrayOfChildren(parsed);
        } catch(e) {
          console.log(e);
        }

        resolve(arrayOfSubdecksAndSlides);
      }).catch((err) => {
        console.log('Error', err);

        resolve(arrayOfSubdecksAndSlides);
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
    let username = 'unknown';
    let avatar = '';
    if (activity.user_id === undefined || activity.user_id === 'undefined') {
      activity.author = {
        id: activity.user_id,
        username: username,
        avatar: avatar
      };
      resolve(activity);
    } else {
      rp.get({uri: Microservices.user.uri + '/user/' + activity.user_id}).then((res) => {
        try {
          let parsed = JSON.parse(res);
          username = parsed.username;
          avatar = parsed.picture;
        } catch(e) {
          console.log(e);
        }

        activity.author = {
          id: activity.user_id,
          username: username,
          avatar: avatar
        };
        resolve(activity);

      }).catch((err) => {
        console.log('Error', err);
        activity.author = {
          id: activity.user_id,
          username: username,
          avatar: avatar
        };
        resolve(activity);
      });
    }
  });

  return myPromise;
}

//find content title and ownerId using deck microservice
function findContentTitleAndOwnerIfNeeded(activity) {
  let myPromise = new Promise((resolve, reject) => {
    if (activity.content_kind === 'slide' || activity.content_kind === 'deck' ) {
      let title = '';
      let ownerId = '0';

      let contentIdParts = activity.content_id.split('-');
      let contentRevisionId = (contentIdParts.length > 1) ? contentIdParts[contentIdParts.length - 1] : undefined;
      rp.get({uri: Microservices.deck.uri + '/' + activity.content_kind + '/' + activity.content_id}).then((res) => {
        try {
          let parsed = JSON.parse(res);
          if (parsed.user) {
            ownerId = parsed.user;
          }
          if (parsed.revisions !== undefined && parsed.revisions.length > 0 && parsed.revisions[0] !== null) {
            //get title from result
            let contentRevision = (contentRevisionId !== undefined) ? parsed.revisions.find((revision) =>  String(revision.id) ===  String(contentRevisionId)) : undefined;
            if (contentRevision !== undefined) {
              ownerId = contentRevision.user;
              title = contentRevision.title;
            } else {//if revision from content_id is not found take data from active revision
              const activeRevisionId = parsed.active;
              let activeRevision = parsed.revisions[parsed.revisions.length - 1];//if active is not defined take the last revision in array
              if (activeRevisionId !== undefined) {
                activeRevision = parsed.revisions.find((revision) =>  String(revision.id) ===  String(activeRevisionId));
              }
              if (activeRevision !== undefined) {
                title = activeRevision.title;
                if (contentRevisionId === undefined) {
                  contentRevisionId = activeRevisionId;
                }
              }
            }
          }
        } catch(e) {
          console.log(e);
        }

        resolve({title: title, ownerId: String(ownerId), revisionId: contentRevisionId});
      }).catch((err) => {
        console.log('Error', err);

        resolve({title: title, ownerId: String(ownerId), revisionId: contentRevisionId});
      });
    } else {
      resolve({title: '', ownerId: '', revisionId: ''});
    }
  });

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
