'use strict';

const Microservices = require('../configs/microservices');

module.exports = {

  actor: function(user) {
    return {
      objectType: 'Agent',

      // TODO Investigate how LRS can manage anonymous data (unregistered users)

      // TODO should users be able to select whether their account is shown here or not ?
      // mbox_sha1sum: user.mbox_sha1,

      account: {
        homePage : Microservices.platform.uri,
        name: user.username,
      },

    };
  },

};
