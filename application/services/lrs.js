'use strict';

const { LRS: lrsOptions } = require('../configuration');
const transforms = require('../lib/transforms');

const self = module.exports = {

  isAvailable: function() {
    return getLRS() !== null;
  },

  saveActivity: function(activity, credentials) {
    if (!self.isAvailable()) {
      throw new Error('LRS connection is not available');
    }

    return transforms.transform(activity, credentials).then((statement) => {
      // console.log(statement);

      return new Promise((resolve, reject) => {
        getLRS().saveStatement(statement, {
          callback: (httpErrorCode, xhr) => {
            if (httpErrorCode !== null) {
              let errMessage = [];
              if (xhr !== null) {
                let details;
                try {
                  details = JSON.parse(xhr.responseText);
                } catch (err) {
                  // could not parse the details as JSON, will include the message as-is
                }

                errMessage.push(details && details.message || xhr.responseText);
              } else {
                // nothing more specific other than the error code
                errMessage.push(`HTTP Error Code: ${httpErrorCode}`);
              }
              errMessage.push(JSON.stringify({activity, statement}));
              return reject(new Error(errMessage));
            }

            resolve(statement);
          }

        });

      });

    });

  },

};


// private members
const TinCan = require('tincanjs');

let lrs;
function getLRS(force) {
  // return already instantiaded lrs
  if (lrs) return lrs;
  // if we return null means we service is not available, use force=true to retry
  if (lrs === null && !force) return null;

  try {
    lrs = new TinCan.LRS(lrsOptions);
  } catch (err) {
    lrs = null;
    console.warn('Error establishing connection to LRS', err);
  }

  return lrs;
}
