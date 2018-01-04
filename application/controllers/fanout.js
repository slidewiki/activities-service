'use strict';

const lrsService = require('../services/lrs');

const self = module.exports = {

  processActivity: function(request, reply) {
    request.log('started', request.payload);

    // it's an array
    let activities = request.payload;
    if (!(activities instanceof Array)) {
      activities = [activities];
    }

    activities.reduce((p, act) => {
      return p.then(() => {
        return lrsService.saveActivity(act, request.auth.credentials);
      });

    }, Promise.resolve())
      .then((res) => {
        request.log('finished', res);
      })
      .catch((err) => {
        request.log('error', err);
      });

    // reply immediately, don't let the request to lrs delay this one
    reply();
  },

};
