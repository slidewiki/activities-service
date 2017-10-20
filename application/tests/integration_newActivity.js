/* eslint dot-notation: 0, no-unused-vars: 0 */
'use strict';

//Mocking is missing completely TODO add mocked objects

describe('REST API', () => {

  let server;

  const JWT = require('jsonwebtoken');
  const secret = 'NeverShareYourSecret';

  beforeEach((done) => {
    //Clean everything up before doing new tests
    Object.keys(require.cache).forEach((key) => delete require.cache[key]);
    require('chai').should();
    let hapi = require('hapi');
    server = new hapi.Server();
    server.connection({
      host: 'localhost',
      port: 3000
    });

    server.register(require('hapi-auth-jwt2'), (err) => {
      if (err) {
        console.error(err);
        global.process.exit();
      } else {
        server.auth.strategy('jwt', 'jwt', {
          key: secret,
          validateFunc: (decoded, request, callback) => {callback(null, true);},
          headerKey: '----jwt----',
        });
      }

      require('../routes.js')(server);
      done();
    });

  });

  let authToken = JWT.sign( { userid: 1 }, secret );

  let activity = {
    activity_type: 'add',
    content_id: '000000000000000000000000-1',
    content_kind: 'slide',
    content_name: ' ',
    content_owner_id: '000000000000000000000000',
    user_id: '000000000000000000000000'
  };
  let options = {
    method: 'POST',
    url: '/activity/new',
    payload: activity,
    headers: {
      'Content-Type': 'application/json',
      '----jwt----': authToken,
    }
  };

  context('when creating an activity it', () => {
    it('should reply it', () => {
      return server.inject(options).then((response) => {
        response.should.be.an('object').and.contain.keys('statusCode','payload');
        // console.log(response);
        response.statusCode.should.equal(200);
        response.payload.should.be.a('string');
        let payload = JSON.parse(response.payload);
        payload.should.be.an('object').and.contain.keys('content_id', 'timestamp', 'user_id');
        payload.content_id.should.equal('000000000000000000000000-1');
        payload.user_id.should.equal('000000000000000000000000');
      });
    });
  });
});
