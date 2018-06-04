'use strict';

const _ = require('lodash');
const rp = require('request-promise-native');

const Microservices = require('../configs/microservices');

const self = module.exports = {

  // promises user public info for a list of user ids
  fetchUserInfo: function(userIds) {
    // return empty list if nothing provided
    if (_.isEmpty(userIds)) {
      return Promise.resolve([]);
    }

    return rp.post({
      uri: `${Microservices.user.uri}/users`,
      json: true,
      body: userIds,
    }).then((users) => {
      return users.map((u) => ({
        id: u._id,
        username: u.username,
        picture: u.picture,
        country: u.country,
        organization: u.organization
      }));

    });

  },

  // promises group public info for a list of group ids (not the users in the groups)
  fetchGroupInfo: function(groupIds) {
    // return empty list if nothing provided
    if (_.isEmpty(groupIds)) {
      return Promise.resolve([]);
    }

    return rp.post({
      uri: `${Microservices.user.uri}/usergroups`,
      json: true,
      body: groupIds,
    }).then((groups) => {
      return groups.map((g) => ({
        id: g.id,
        name: g.name
      }));

    });
  },

};
