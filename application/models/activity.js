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
const activity = {
  type: 'object',
  properties: {
    activity_type: {
      type: 'string',
      enum: ['translate', 'share', 'add', 'edit', 'view', 'move', 'comment', 'reply', 'use', 'attach', 'react', 'rate', 'download', 'exam', 'fork', 'delete', 'joined', 'left', 'prediction']
    },
    timestamp: {
      type: 'object'
    },
    user_id: objectid,
    content_id: {
      type: 'string'
    },
    content_kind: {
      type: 'string',
      enum: ['deck', 'slide', 'group']
    },
    content_name: {
      type: 'string'
    },
    content_owner_id: objectid,
    translation_info: {
      content_id:  {
        type: 'string'
      },
      language: {
        type: 'string'
      }
    },
    share_info: {
      // postURI: {
      //   type: 'string'
      // },
      platform: {
        type: 'string'
      }
    },
    comment_info: {
      comment_id: objectid,
      text: {
        type: 'string'
      },
      parent_comment_owner_id: objectid
    },
    use_info: {
      target_id:  {
        type: 'string'
      },
      target_name: {
        type: 'string'
      }
    },
    react_type: {
      type: 'string'
    },
    rate_type:  {
      type: 'string'
    },
    exam_info: {
      score:   {
        type: 'number'
      }
    },
    fork_info: {
      content_id:  {
        type: 'string'
      }
    },
    delete_info: {
      content_id: {
        type: 'string'
      },
      content_kind: {
        type: 'string',
        enum: ['deck', 'slide', 'group']
      },
      content_name: {
        type: 'string'
      }
    },
    move_info: {
      source_id: {
        type: 'string'
      },
      target_id: {
        type: 'string'
      }
    },
    prediction_info: {
      prediction_activity_type: {
        type: 'string',
        enum: ['start', 'end', 'delete']
      },
      related_prediction_activity_id: {
        type: 'string'
      }
      result: {
        type: 'string'
      },
      accuracy: {
        type: 'string'
      },
      no_of_users: {
        type: 'string'
      },
      no_of_decks: {
        type: 'string'
      },
    }
  },
  required: ['content_id', 'user_id', 'activity_type']
};

//export
module.exports = ajv.compile(activity);
