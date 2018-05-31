'use strict';

const { LRS: lrsOptions } = require('../configuration');
const transforms = require('../lib/transforms');

const self = module.exports = {

  saveActivity: function(activity, credentials) {
    return transforms.transform(activity, credentials).then((statement) => {
      console.log(statement);

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
function getLRS() {
  if (lrs) return lrs;

  try {
    lrs = new TinCan.LRS(lrsOptions);
  } catch (err) {
    // TODO log or throw ?
    console.log(`connection to the LRS is currently unavailable: ${err}`);

    throw new Error(`connection to the LRS is currently unavailable: ${err}`);
  }

  return lrs;
}
