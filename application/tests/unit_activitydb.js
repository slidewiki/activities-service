// example unit tests
'use strict';

//Mocking is missing completely TODO add mocked objects

describe('Database', () => {

  let db, helper; //expect

  beforeEach((done) => {
    //Clean everything up before doing new tests
    Object.keys(require.cache).forEach((key) => delete require.cache[key]);
    require('chai').should();
    let chai = require('chai');
    let chaiAsPromised = require('chai-as-promised');
    chai.use(chaiAsPromised);
    //expect = require('chai').expect;
    db = require('../database/activityDatabase.js');
    helper = require('../database/helper.js');
    helper.cleanDatabase()
      .then(() => done())
      .catch((error) => done(error));
  });

  context('when having an empty database', () => {
    it('should return null when requesting a non existant activity', () => {
      return db.get('asd7db2daasd').should.be.fulfilled.and.become(null);
    });

    it('should return the activity when inserting one', () => {
      let activity = {
        activity_type: 'add',
        content_id: '112233445566778899000671',
        content_kind: 'slide',
        user_id: '112233445566778899001213'
      };
      let res = db.insert(activity);
      return Promise.all([
        res.should.be.fulfilled.and.eventually.not.be.empty,
        res.should.eventually.have.property('ops').that.is.not.empty,
        res.should.eventually.have.deep.property('ops[0]').that.has.all.keys('_id', 'activity_type', 'timestamp', 'content_id', 'content_kind', 'user_id'),
        res.should.eventually.have.deep.property('ops[0].activity_type', activity.activity_type)
      ]);
    });

    it('should get an previously inserted activity', () => {
      let activity = {
        activity_type: 'add',
        content_id: '112233445566778899000671',
        content_kind: 'slide',
        user_id: '112233445566778899001213'
      };
      let ins = db.insert(activity);
      let res = ins.then((ins) => db.get(ins.ops[0]._id));
      return Promise.all([
        res.should.be.fulfilled.and.eventually.not.be.empty,
        res.should.eventually.have.all.keys('_id', 'activity_type', 'timestamp', 'content_id', 'content_kind', 'user_id'),
        res.should.eventually.have.property('activity_type', activity.activity_type)
      ]);
    });

    it('should be able to replace an previously inserted activity', () => {
      let activity = {
        activity_type: 'add',
        content_id: '112233445566778899000671',
        content_kind: 'slide',
        user_id: '112233445566778899001213'
      };
      let activity2 = {
        activity_type: 'share',
        content_id: '112233445566778899000671',
        content_kind: 'slide',
        user_id: '112233445566778899001213'
      };
      let ins = db.insert(activity);
      let res = ins.then((ins) => db.replace(ins.ops[0]._id, activity2));
      res = ins.then((ins) => db.get(ins.ops[0]._id));
      return Promise.all([
        res.should.be.fulfilled.and.eventually.not.be.empty,
        res.should.eventually.have.all.keys('_id', 'activity_type', 'timestamp', 'content_id', 'content_kind', 'user_id'),
        res.should.eventually.have.property('activity_type', 'share')
      ]);
    });
  });
});
