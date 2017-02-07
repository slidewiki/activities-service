// example unit tests
'use strict';

//Mocking is missing completely TODO add mocked objects

describe('Activity service', () => {

  let handler, expect;

  beforeEach((done) => {
    //Clean everything up before doing new tests
    Object.keys(require.cache).forEach((key) => delete require.cache[key]);
    require('chai').should();
    let chai = require('chai');
    let chaiAsPromised = require('chai-as-promised');
    chai.use(chaiAsPromised);
    expect = require('chai').expect;
    handler = require('../controllers/handler.js');
    done();
  });

  const activity = {
    activity_type: 'add',
    content_id: '112233445566778899000671',
    content_kind: 'slide',
    user_id: '000000000000000000000000'
  };
  let activityId = '';

  context('Using all exported functions - ', () => {
    // it('Add activity', () => {
    //   let req = {
    //     payload: activity
    //   };
    //
    //   return handler.newActivity(req, (result) => {
    //     expect(result.id).to.not.equal(undefined);
    //     activityId = result.id;
    //     return;
    //   })
    //   .catch((Error) => {
    //     console.log(Error);
    //     throw Error;
    //     expect(1).to.equals(2);
    //   });
    // });

    // it('Get comment', () => {
    //   let req = {
    //     params: {
    //       id: commentId
    //     }
    //   };
    //
    //   return handler.getComment(req, (result) => {
    //     expect(String(result.id)).to.equal(String(commentId));
    //     expect(result.title).to.equal(comment.title);
    //     return;
    //   })
    //   .catch((Error) => {
    //     console.log(Error);
    //     throw Error;
    //     expect(1).to.equals(2);
    //   });
    // });
    // it('Update comment', () => {
    //   const comment2 = {
    //     content_id: content_id,
    //     content_kind: content_kind,
    //     title: 'Updated_Unit_handler_dummy',
    //     text: 'handler_dummy',
    //     user_id: '000000000000000000000000',
    //     is_activity: false
    //   };
    //   let req = {
    //     params: {
    //       id: commentId
    //     },
    //     payload: comment2
    //   };
    //
    //   return handler.updateComment(req, (result) => {
    //
    //     return handler.getComment(req, (result2) => {
    //       expect(String(result2.id)).to.equal(String(commentId));
    //       expect(result2.title).to.equal(comment2.title);
    //       return;
    //     });
    //
    //   })
    //   .catch((Error) => {
    //     console.log(Error);
    //     throw Error;
    //     expect(1).to.equals(2);
    //   });
    // });

    // it('Delete activity', () => {
    //   let req = {
    //     payload: {
    //       id: activityId
    //     }
    //   };
    //   return handler.deleteActivity(req, (result) => {
    //     expect(result.msg).to.not.equal(undefined);
    //     return;
    //   })
    //   .catch((Error) => {
    //     console.log('Error', Error);
    //     throw Error;
    //     expect(1).to.equals(2);
    //   });
    // });

  });
});
