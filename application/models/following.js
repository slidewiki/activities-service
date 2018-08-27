'use strict';

//require
let Ajv = require('ajv');
let ajv = Ajv({
  verbose: true,
  allErrors: true
  //v5: true  //enable v5 proposal of JSON-schema standard
}); // options can be passed, e.g. {allErrors: true}

//build schema
const objectid = {
  type: 'string',
  maxLength: 24,
  minLength: 1
};
const following = {
  type: 'object',
  properties: {
    user_id: objectid,
    followed_type: {
      type: 'string',
      enum: ['deck', 'slide', 'playlist', 'user']
    },
    followed_id: {
      type: 'string'
    }
  },
  required: ['user_id', 'followed_type', 'followed_id']
};

//export
module.exports = ajv.compile(following);
