'use strict';

const { LRS: lrsOptions } = require('../configuration');
const transforms = require('../lib/transforms');

const self = module.exports = {

  saveActivity: function(activity, credentials) {
    console.log('Saving activity: ' + JSON.stringify(activity));
    return transforms.transform(activity, credentials).then((statement) => {

      return new Promise((resolve, reject) => {
        console.log('Statement being sent is: ');
        console.log(JSON.stringify(statement));
        console.log('Statement finished.');
        getLRS().saveStatement(statement, {
          callback: (httpErrorCode, xhr) => {
            if (httpErrorCode !== null) {
              let errMessage = [];
              if (xhr !== null) {
                let details;
                try {
                  details = JSON.parse(xhr.responseText);
                  console.log(JSON.stringify(details));
                } catch (err) {
                  console.log('Error 1: ' + err);
                }

                errMessage.push(details && details.message || xhr.responseText);
              } else {
                errMessage.push(`HTTP Error Code: ${httpErrorCode}`);
              }
              console.log(JSON.stringify({activity, statement}));
              errMessage.push(JSON.stringify({activity, statement}));
              console.log('Error 2: ' + errMessage);
              return reject(new Error(errMessage));
            }
            console.log('XHR: ' + xhr.responseText);
            console.log('Resolving statement ' + statement);
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
