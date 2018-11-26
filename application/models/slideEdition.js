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

const currentEdition = {
  type: 'object',
  properties: {
    user_id: objectid,
    slide_in_edition: {
      type: 'string'
    },
    timestamp: {
      type: 'string'
    }
  },
  required: ['user_id', 'slide_in_edition', 'timestamp']
};

//export
module.exports = ajv.compile(currentEdition);
