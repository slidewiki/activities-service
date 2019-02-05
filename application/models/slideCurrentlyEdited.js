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

const slideCurrentlyEdited = {
  type: 'object',
  properties: {
    userId: objectid,
    slideCurrentlyEdited: {
      type: 'string'
    },
    timestamp: {
      type: 'string'
    }
  },
  required: ['userId', 'slideCurrentlyEdited', 'timestamp']
};

//export
module.exports = ajv.compile(slideCurrentlyEdited);
