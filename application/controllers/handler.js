/*
Handles the requests by executing stuff and replying to the client. Uses promises to get stuff done.
*/
/* eslint promise/always-return: "off" */

'use strict';

const boom = require('boom'), //Boom gives us some predefined http codes and proper responses
  activitiesDB = require('../database/activitiesDatabase'), //Database functions specific for activities
  followingsDB = require('../database/followingsDatabase'), //Database functions specific for activities
  //followHandlers = require('./followHandlers'),
  co = require('../common');

const Microservices = require('../configs/microservices');
let rp = require('request-promise-native');

//Send request to insert new notification
function createNotifications(notificationDataArray) {
  //TODO find list of subscribed users
  // if (activity.content_id.split('-')[0] === '8') {//current dummy user is subscribed to this content_id
  if (notificationDataArray === undefined || notificationDataArray.length === 0) {
    return;
  }
  let notifications = [];
  notificationDataArray.forEach((notificationData) => {
    let activity = notificationData.activity;
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
      rate_type:  activity.rate_type,
      subscribed_user_ids: notificationData.subscribed_user_ids,
      activity_id: activity.id
    };
    notifications.push(notification);
  });

  let data = JSON.stringify(notifications);

  rp.post({uri: Microservices.notification.uri + '/notifications/new', body:data})
    .catch((e) => {
      console.log('problem with createNotification: ' + e);
    });
}

let self = module.exports = {

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
          if (co.isEmpty(inserted.ops) || co.isEmpty(inserted.ops[0]))
            throw inserted;
          else {
            return insertAuthor(inserted.ops[0]).then((activity) => {
              let arrayOfUsersToNotify = [];

              const activity_types_for_notifications = ['translate', 'share', 'add', 'edit', 'move', 'comment', 'reply', 'use', 'attach', 'react', 'rate', 'download', 'fork', 'delete', 'joined', 'left'];
              activity = co.rewriteID(activity);

              if (activity_types_for_notifications.includes(activity.activity_type)) {//Create notifications
                if (activity.content_owner_id && activity.user_id !== activity.content_owner_id) {// notify owner if it wasn't him/her that created the activity
                  arrayOfUsersToNotify.push(activity.content_owner_id);
                }

                if (activity.activity_type === 'reply' && activity.user_id !== activity.comment_info.parent_comment_owner_id) {
                  //find the parent comment owner and create notification
                  const parentCommentOwnerId = activity.comment_info.parent_comment_owner_id;

                  if (activity.user_id !== parentCommentOwnerId && activity.content_owner_id !== parentCommentOwnerId) {
                    arrayOfUsersToNotify.push(parentCommentOwnerId);
                  }
                }

                let deckIdArray = [];
                let playlistIdArray = [];
                return Promise.all([
                  getDeepUsage(activity.content_kind, activity.content_id),
                  getPlaylists(activity.content_kind, activity.content_id)
                ]).then(([decks, playlists]) => {
                  if (activity.content_kind === 'deck') {
                    deckIdArray.push(activity.content_id.split('-')[0]);
                  }

                  decks.forEach((deck) => {
                    deckIdArray.push(deck.id);
                  });
                  playlists.forEach((playlist) => {
                    playlistIdArray.push(playlist._id);
                  });
                  return followingsDB.getFollowingsForTypesAndIds(['deck', 'playlist'], [deckIdArray, playlistIdArray]).then((followings) => {
                    followings.forEach((following) => {
                      co.rewriteID(following);
                      if (!arrayOfUsersToNotify.includes(following.user_id) && activity.user_id !== following.user_id) {
                        arrayOfUsersToNotify.push(following.user_id);
                      }
                    });

                    if (arrayOfUsersToNotify.length > 0) {
                      let notificationsDataArray = [{activity: activity, subscribed_user_ids: arrayOfUsersToNotify}];
                      createNotifications(notificationsDataArray);
                    }

                    reply(activity);
                  }).catch((error) => {
                    tryRequestLog(request, 'error', error);
                    reply(boom.badImplementation());
                  });
                }).catch((error) => {
                  tryRequestLog(request, 'error', error);
                  reply(boom.badImplementation());
                });
              } else {
                reply(activity);
              }
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
      .then((contentTitlesAndOwners) => {
        for (let i = 0; i < contentTitlesAndOwners.length; i++) {
          let contentTitleAndOwner = contentTitlesAndOwners[i];
          if (contentTitleAndOwner.title !== '') {
            activities[i].content_name = contentTitleAndOwner.title;
            activities[i].content_owner_id = contentTitleAndOwner.ownerId;
            let contentIdParts = activities[i].content_id.split('-');
            if (contentIdParts.length === 1) {//there is no revision id
              activities[i].content_id += '-' + contentTitleAndOwner.revisionId;
            }
          }
        }

        activitiesDB.insertArray(activities).then((inserted) => {
          if (co.isEmpty(inserted.ops) || co.isEmpty(inserted.ops[0]))
            throw inserted;
          else {
            let activities = inserted.ops;
            let notificationsDataArray = [];

            const activity_types_for_notifications = ['translate', 'share', 'add', 'edit', 'move', 'comment', 'reply', 'use', 'attach', 'react', 'rate', 'download', 'fork', 'delete', 'joined', 'left'];

            let deepUsagesPromises = [];
            let playlistsPromises = [];
            for (let i = 0; i < activities.length; i++) {
              let activity = activities[i];
              if (activity_types_for_notifications.includes(activity.activity_type)) {
                deepUsagesPromises.push(getDeepUsage(activity.content_kind, activity.content_id));
                playlistsPromises.push(getPlaylists(activity.content_kind, activity.content_id));
              } else {
                deepUsagesPromises.push(new Promise((resolve) => {resolve([]);}));
                playlistsPromises.push(new Promise((resolve) => {resolve([]);}));
              }
            }

            return Promise.all([Promise.all(deepUsagesPromises), Promise.all(playlistsPromises)]).then(([decksResultArray, playlistsResultArray]) => {
              let followingsPromises = [];
              for (let j = 0; j < activities.length; j++) {
                let deckIdArray = [];
                let playlistIdArray = [];

                if (activity_types_for_notifications.includes(activities[j].activity_type)) {
                  let currentDecks = decksResultArray[j];
                  let currentPlaylists = playlistsResultArray[j];

                  if (activities[j].content_kind === 'deck') {
                    deckIdArray.push(activities[j].content_id.split('-')[0]);
                  }
                  for (let k = 0; k < currentDecks.length; k++) {
                    deckIdArray.push(currentDecks[k].id);
                  }
                  for (let k = 0; k < currentPlaylists.length; k++) {
                    playlistIdArray.push(currentPlaylists[k]._id);
                  }

                  followingsPromises.push(followingsDB.getFollowingsForTypesAndIds(['deck', 'playlist'], [deckIdArray, playlistIdArray]));
                } else {
                  followingsPromises.push(new Promise((resolve) => {resolve([]);}));
                }
              }

              return Promise.all(followingsPromises).then((followingsArray) => {
                for (let k = 0; k < activities.length; k++) {
                  let activity = co.rewriteID(activities[k]);
                  let arrayOfUsersToNotify = [];

                  if (activity_types_for_notifications.includes(activity.activity_type)) {
                    if (activity.content_owner_id && activity.user_id !== activity.content_owner_id) {// notify user if it wasn't him/her that created the activity
                      arrayOfUsersToNotify.push(activity.content_owner_id);
                    }

                    if (activity.activity_type === 'reply' && activity.user_id !== activity.comment_info.parent_comment_owner_id) {
                      //find the parent comment owner and create notification
                      const parentCommentOwnerId = activity.comment_info.parent_comment_owner_id;

                      if (activity.user_id !== parentCommentOwnerId && activity.content_owner_id !== parentCommentOwnerId) {
                        arrayOfUsersToNotify.push(parentCommentOwnerId);
                      }
                    }

                    let followings = followingsArray[k];
                    followings.forEach((following) => {
                      co.rewriteID(following);
                      if (!arrayOfUsersToNotify.includes(following.user_id) && activity.user_id !== following.user_id) {
                        arrayOfUsersToNotify.push(following.user_id);
                      }
                    });

                    if (arrayOfUsersToNotify.length > 0) {
                      notificationsDataArray.push({activity: activity, subscribed_user_ids: arrayOfUsersToNotify});
                    }
                  }
                }
                if (notificationsDataArray.length > 0) {
                  createNotifications(notificationsDataArray);
                }

                return insertAuthors(inserted.ops).then(() => {
                  reply(activities);
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
    if (request.params.id === '-1') {
      self.getAllActivities(request, reply);
    } else {
      let content_kind = request.params.content_kind;
      let content_id = request.params.id;

      const metaonly = request.query.metaonly;
      const activity_type = request.query.activity_type;
      // const include_subdecks_and_slides = request.query.include_subdecks_and_slides;//TODO use this and refactor
      let activityTypeArray = activity_type;
      if (activity_type !== undefined) {
        activityTypeArray = (activity_type.constructor !== Array) ? [activity_type] : activity_type;
      }
      const all_revisions = request.query.all_revisions;
      const start = (request.query.start) ? request.query.start : 0;
      const limit = (request.query.limit) ? request.query.limit : 0;

      if (metaonly === 'true' && activityTypeArray !== undefined && activityTypeArray.length === 1) {
        if (all_revisions === 'true') {
          content_id = new RegExp('^' + request.params.id.split('-')[0]);
        }

        return activitiesDB.getCountAllOfTypeForDeckOrSlide(activityTypeArray, content_kind, content_id)
          .then((count) => {
            reply(count);
          }).catch((error) => {
            tryRequestLog(request, 'error', error);
            reply(boom.badImplementation());
          });
      } else {

        let activitiesPromise = getSubdecksAndSlides(content_kind, content_id).then((arrayOfDecksAndSlides) => {
          let slideIdArray = [];
          let deckIdArray = [];

          arrayOfDecksAndSlides.forEach((deckOrSlide) => {
            if (deckOrSlide.type === 'slide') {
              slideIdArray.push(deckOrSlide.id);
            } else {
              deckIdArray.push(deckOrSlide.id);
            }
          });

          return activitiesDB.getAllWithProperties(activityTypeArray, [], slideIdArray, deckIdArray, [], start, limit);
        }).catch((error) => {
          tryRequestLog(request, 'error', error);
          reply(boom.badImplementation());
        });

        if (activityTypeArray !== undefined && activityTypeArray.length === 1) {
          if (content_kind === 'user') {
            activitiesPromise = activitiesDB.getAllWithProperties(activityTypeArray, [content_id], [], [], [], start, limit);
          } else {
            if (all_revisions === 'true') {
              content_id = new RegExp('^' + request.params.id.split('-')[0]);
            }
            activitiesPromise = activitiesDB.getAllOfTypeForDeckOrSlide(activityTypeArray, content_kind, content_id, start, limit);
          }
        }

        return activitiesPromise
          .then((activities) => {
            if (metaonly === 'true') {
              reply(activities.length);
            } else {
              activities.forEach((activity) => {
                co.rewriteID(activity);
              });

              insertAuthors(activities).then((activities) => {
                let jsonReply = JSON.stringify({items: activities, count: activities.length});
                reply(jsonReply);
              }).catch((error) => {
                tryRequestLog(request, 'error', error);
                reply(boom.badImplementation());
              });
            }
          }).catch((error) => {
            tryRequestLog(request, 'error', error);
            reply(boom.badImplementation());
          });
      }
    }
  },

  //Get All Activities from database
  getAllActivities: function(request, reply) {
    return activitiesDB.getAllFromCollection()
      .then((activities) => {
        activities.forEach((activity) => {
          co.rewriteID(activity);
        });

        insertAuthors(activities).then((activities) => {
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


  //Count activities of certain type, group by deck/slide ids and return max
  getActivitiesMaxCount: function(request, reply) {
    const all_revisions = request.query.all_revisions;
    const activity_type = request.query.activity_type;
    let activityTypeArray = activity_type;
    if (activity_type !== undefined) {
      activityTypeArray = (activity_type.constructor !== Array) ? [activity_type] : activity_type;
    }
    const content_kind = request.query.content_kind;
    let contentKindArray = content_kind;
    if (content_kind !== undefined) {
      contentKindArray = (content_kind.constructor !== Array) ? [content_kind] : content_kind;
    } else {
      contentKindArray = ['deck', 'slide'] ;
    }

    const limit = (request.query.limit) ? request.query.limit : 10;
    return activitiesDB.getMaxCountFromCollection(activityTypeArray, all_revisions, contentKindArray, limit)
      .then((maxCount) => {
        reply(maxCount);
      }).catch((error) => {
        tryRequestLog(request, 'error', error);
        reply(boom.badImplementation());
      });
  }
};

function getSubdecksAndSlides(content_kind, id) {
  let myPromise = new Promise((resolve) => {
    if (content_kind !== 'deck') {
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
          resolve(arrayOfSubdecksAndSlides);
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
  let myPromise = new Promise((resolve) => {

    if (activity.user_id === '0') {
      activity.author = {
        id: '0',
        username: 'Guest'
      };
      resolve(activity);
    } else if (activity.user_id === undefined || activity.user_id === 'undefined') {
      console.log('Error user_id', activity.user_id);
      activity.author = {
        id: 'undefined',
        username: 'unknown'
      };
      resolve(activity);
    } else {
      rp.get({uri: Microservices.user.uri + '/user/' + activity.user_id}).then((res) => {
        let username = '';
        let displayName = undefined;
        try {
          let parsed = JSON.parse(res);
          username = parsed.username;
          displayName = parsed.displayName;
        } catch(e) {
          console.log(e);
          activity.author = {
            id: activity.user_id,
            username: 'user ' + activity.user_id
          };
          resolve(activity);
        }

        activity.author = {
          id: activity.user_id,
          username: username,
          displayName: displayName
        };
        resolve(activity);

      }).catch((err) => {
        console.log('Error', err);
        activity.author = {
          id: activity.user_id,
          username: 'user ' + activity.user_id
        };
        resolve(activity);
      });
    }
  });

  return myPromise;
}

//insert author data to an array of activities using user microservice
function insertAuthors(activities) {
  let myPromise = new Promise((resolve) => {

    //Create array of user ids
    let arrayOfUserIds = [];
    activities.forEach((activity) => {
      const id = parseInt(activity.user_id);
      if (id !== 0 && !arrayOfUserIds.includes(id)) {
        arrayOfUserIds.push(id);
      }
    });

    if (arrayOfUserIds.length === 0) {
      activities.forEach((activity) => {
        activity.author = {
          id: '0',
          username: 'Guest'
        };
      });
      resolve(activities);
    } else {

      let data = JSON.stringify(arrayOfUserIds);
      rp.post({uri: Microservices.user.uri + '/users', body:data}).then((res) => {
        try {
          let userDataArray = JSON.parse(res);

          userDataArray.forEach((userData) => {
            let userId = userData._id;
            let username = userData.username;
            let displayName = userData.displayName;
            activities.forEach((activity) => {
              if (parseInt(activity.user_id) === userId) {
                activity.author = {
                  id: activity.user_id,
                  username: username,
                  displayName: displayName
                };
              }
            });
          });

          activities.forEach((activity) => {
            if (activity.author === undefined) {
              activity.author = {
                id: activity.user_id,
                username: 'Guest'
              };
            }
          });
          resolve(activities);

        } catch(e) {
          console.log(e);
          activities.forEach((activity) => {
            activity.author = {
              id: activity.user_id,
              username: 'user ' + activity.user_id
            };
          });
          resolve(activities);
        }

      }).catch((err) => {
        console.log('Error', err);
        activities.forEach((activity) => {
          activity.author = {
            id: activity.user_id,
            username: 'user ' + activity.user_id
          };
        });
        resolve(activities);
      });
    }
  });

  return myPromise;
}

//find content title and ownerId using deck microservice
function findContentTitleAndOwnerIfNeeded(activity) {
  let myPromise = new Promise((resolve) => {
    if (activity.content_kind === 'slide' || activity.content_kind === 'deck' ) {
      let title = activity.content_name;
      let ownerId = activity.content_owner_id;

      let contentIdParts = activity.content_id.split('-');
      let contentRevisionId = (contentIdParts.length > 1) ? contentIdParts[contentIdParts.length - 1] : undefined;
      if (title === undefined || title === null || ownerId === undefined || contentRevisionId === undefined) {// is it needed to call the deck-service?
        rp.get({uri: Microservices.deck.uri + '/' + activity.content_kind + '/' + activity.content_id}).then((res) => {
          try {
            let parsed = JSON.parse(res);

            if (parsed.revisions !== undefined && parsed.revisions.length > 0 && parsed.revisions[0] !== null) {
              //get title from result
              let contentRevision = (contentRevisionId !== undefined) ? parsed.revisions.find((revision) =>  String(revision.id) ===  String(contentRevisionId)) : undefined;
              if (contentRevision !== undefined) {
                if (ownerId === undefined || ownerId === null || ownerId <= 0) {
                  ownerId = contentRevision.user;
                }
                if (title === undefined || title === null) {
                  title = contentRevision.title;
                }
              } else {//if revision from content_id is not found take data from active revision
                const activeRevisionId = parsed.active;
                let activeRevision = parsed.revisions[parsed.revisions.length - 1];//if active is not defined take the last revision in array
                if (activeRevisionId !== undefined) {
                  activeRevision = parsed.revisions.find((revision) =>  String(revision.id) ===  String(activeRevisionId));
                }
                if (activeRevision !== undefined) {
                  if (title === undefined || title === null) {
                    title = activeRevision.title;
                  }
                  if (contentRevisionId === undefined) {
                    contentRevisionId = activeRevisionId;
                  }
                }
              }
            }
            if ((ownerId === undefined || ownerId === null ||ownerId <= 0) && parsed.user) {
              ownerId = parsed.user;
            }
          } catch(e) {
            console.log(e);
            resolve({title: title, ownerId: String(ownerId), revisionId: contentRevisionId});
          }

          resolve({title: title, ownerId: String(ownerId), revisionId: contentRevisionId});
        }).catch((err) => {
          console.log('Error', err);
          resolve({title: title, ownerId: String(ownerId), revisionId: contentRevisionId});
        });
      } else {
        resolve({title: title, ownerId: String(ownerId), revisionId: contentRevisionId});
      }
    } else {
      resolve({title: '', ownerId: '', revisionId: ''});
    }
  });

  return myPromise;
}

function getDeepUsage(content_kind, id) {
  let myPromise = new Promise((resolve) => {

    rp.get({uri: Microservices.deck.uri + '/' + content_kind + '/' + id + '/deepusage'}).then((res) => {
      resolve(JSON.parse(res));
    }).catch((err) => {
      console.log('Error', err);
      resolve([]);
    });
  });

  return myPromise;
}

function getPlaylists(content_kind, id) {
  let myPromise = new Promise((resolve) => {
    resolve([]);
  });
  if (content_kind === 'deck') {
    myPromise = new Promise((resolve) => {
      rp.get({uri: Microservices.deck.uri + '/deck/' + id + '/groups'}).then((res) => {
        resolve(JSON.parse(res));
      }).catch((err) => {
        console.log('Error', err);
        resolve([]);
      });
    });
  }

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
