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
  minLength: 24
};
const activity = {
  type: 'object',
  properties: {
    activity_type: {
      type: 'string',
      enum: ['translate', 'share', 'add', 'edit', 'comment', 'reply', 'use', 'react', 'rate', 'download']
    },
    timestamp: {
      type: 'object'
    },
    user_id: objectid,
    content_id: objectid,
    content_kind: {
      type: 'string',
      enum: ['deck', 'slide']
    },
    translation_info: {
      content_id: objectid,
      language: {
        type: 'string'
      }
    },
    share_info: {
      postURI: {
        type: 'string'
      },
      platform: {
        type: 'string'
      }
    },
    comment_info: {
      id: objectid,
      text: {
        type: 'string'
      }
    },
    use_info: {
      target_id: objectid,
      target_name: {
        type: 'string'
      }
    },
    react_type: {
      type: 'string'
    },
    rate_type:  {
      type: 'string'
    }
  },
  required: ['content_id', 'user_id', 'activity_type']
};

//export
module.exports = ajv.compile(activity);
