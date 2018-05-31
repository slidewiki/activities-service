'use strict';

const Microservices = require('../configs/microservices');

module.exports = {

  actor: function(user) {
    return {
      objectType: 'Agent',
      // name: user.username,

      // TODO Investigate how LRS can manage anonymous data (unregistered users)

      mbox_sha1sum: user.mbox_sha1,
      // account: {
      //   homePage : Microservices.platform.uri,
      //   name: user.username,
      // },

    };

  },

};
