'use strict';

const helper = require('./helper');

// this function should include commands that create indexes (if any)
// for any collections that the service may be using

// it should always return a promise
module.exports = function() {

  return helper.getCollection('activities').then((activities) => {
    return activities.createIndexes([
      { key: {'content_kind': 1, 'content_id': 1} },
      { key: {'activity_type': 1} },
    ]);
  });

};
