'use strict';

const boom = require('boom');

const { LRS: lrsOptions } = require('../configuration');
const transforms = require('../lib/transforms');

const self = module.exports = {

  isAvailable: function() {
    return getLRS() !== null;
  },

  saveActivities: async function(activities, ticker) {
    if (!self.isAvailable()) {
      throw new Error('LRS connection is not available');
    }

    let statements = [];
    for (let activity of activities) {
      ticker.tick();
      try {
        let statement = await transforms.transform(activity);
        if (!statement) {
          // TODO log warning
          continue;
        }
        statements.push(statement);
      } catch (err) {
        // TODO properly catch not found errors only, log other errors
        // console.info(`failed to create statement for activity ${activity._id}`);
        // console.info(err.message);
      }
    }

    if (!statements.length) return statements;

    return new Promise((resolve, reject) => {
      getLRS().saveStatements(statements, {
        callback: (httpErrorCode, xhr) => {
          if (httpErrorCode !== null) {
            let errMessage = {};
            if (xhr !== null) {
              let details;
              try {
                details = JSON.parse(xhr.responseText);
              } catch (err) {
                // could not parse the details as JSON, will include the message as-is
              }

              errMessage.message = details && details.message || xhr.responseText;
            } else {
              // nothing more specific other than the error code
              errMessage.message = `HTTP Error Code: ${httpErrorCode}`;
            }
            Object.assign(errMessage, { statements });
            return reject(new Error(JSON.stringify(errMessage)));
          }

          resolve(statements);
        }

      });

    });

  },

  saveActivity: function(activity, credentials) {
    if (!self.isAvailable()) {
      throw new Error('LRS connection is not available');
    }

    return transforms.transform(activity, credentials).then((statement) => {
      // console.log(statement);
      if (!statement) {
        return Promise.reject(boom.badData(`could not create an lrs statement for activity: ${activity._id} of type: ${activity.activity_type}`));
      }

      return new Promise((resolve, reject) => {
        getLRS().saveStatement(statement, {
          callback: (httpErrorCode, xhr) => {
            if (httpErrorCode !== null) {
              let errMessage = {};
              if (xhr !== null) {
                let details;
                try {
                  details = JSON.parse(xhr.responseText);
                } catch (err) {
                  // could not parse the details as JSON, will include the message as-is
                }

                errMessage.message = details && details.message || xhr.responseText;
              } else {
                // nothing more specific other than the error code
                errMessage.message = `HTTP Error Code: ${httpErrorCode}`;
              }
              Object.assign(errMessage, {activity, statement});
              return reject(new Error(JSON.stringify(errMessage)));
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
