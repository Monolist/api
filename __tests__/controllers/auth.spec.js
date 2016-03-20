'use strict';

var request     = require('supertest');
var when        = require('when');
var controllers = require('../../api/controllers');
var mailer      = require('../../api/mailer');
var models      = require('../../api/models');
var fixtures    = require('../../utils/fixtures');

describe('Controller: Auth', function() {

  var url = 'http://localhost:3000/v1/';

  it('should return an error on initial check', function(done) {
    request(url)
    .get('auth/check')
    .end(function(err, res) {
      res.status.should.be.equal(401);
      done();
    });
  });

  it('should register a new user, send the welcome email, and log in', function(done) {
    this.timeout(5000);

    var profile = {
      username: 'jane.doe',
      email: 'jane.doe@gmail.com',
      password: 'janedoe1'
    };
    var sendWelcomeStub = sandbox.stub(mailer, 'sendWelcome').returns(when(profile));
    var loginSpy = sandbox.spy(controllers.auth, 'login');

    request(url)
    .post('auth/register')
    .send(profile)
    .end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.data.should.be.instanceof(Object);
      res.body.data.should.have.property('username');
      res.body.data.should.have.property('email');

      sinon.assert.calledOnce(sendWelcomeStub);
      sinon.assert.calledOnce(loginSpy);

      done();
    });
  });

  // TODO: get this test running
  // it('should register a new user, send the welcome email, and log in if Facebook register', function(done) {
  //   this.timeout(5000);

  //   var profile = {
  //     username: 'john.doe',
  //     email: 'john.doe@gmail.com',
  //     facebookId: '12345'
  //   };
  //   var sendWelcomeStub = sandbox.stub(mailer, 'sendWelcome').returns(when(profile));
  //   var loginSpy = sandbox.spy(controllers.auth, 'facebookLogin');

  //   request(url)
  //   .post('auth/register')
  //   .send(profile)
  //   .end(function(err, res) {
  //     res.status.should.be.equal(200);
  //     res.body.data.should.be.instanceof(Object);
  //     res.body.data.should.have.property('username');
  //     res.body.data.should.have.property('email');

  //     sinon.assert.calledOnce(sendWelcomeStub);
  //     sinon.assert.calledOnce(loginSpy);

  //     done();
  //   });
  // });

  it('should log a user in', function(done) {
    var user = {
      username: 'test',
      password: 'test'
    };

    request(url)
    .post('auth/login')
    .send(user)
    .end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.data.should.be.instanceof(Object);
      res.body.data.should.have.property('username');
      res.body.data.should.have.property('email');
      global.cookies = res.headers['set-cookie'].pop().split(';')[0];
      done();
    });
  });

  it('should receive a user when checking after log in', function(done) {
    var req = request(url).get('auth/check');

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      res.body.data.should.be.instanceof(Object);
      res.body.data.should.have.property('username');
      res.body.data.should.have.property('email');
      done();
    });
  });

  it('should log a user out', function(done) {
    var req = request(url).post('auth/logout');

    req.cookies = global.cookies;

    req.end(function(err, res) {
      res.status.should.be.equal(200);
      done();
    });
  });

  it('should start the password reset flow and send the reset email', function(done) {
    var user = fixtures.users[0];

    sandbox.mock(mailer).expects('sendReset')
    .once().returns(when('Response message'));

    sandbox.mock(models.User.Instance.prototype)
    .expects('updateAttributes').once().returns(when(user));

    request(url)
    .post('auth/forgot/' + user.username)
    .end(function(err, res) {
      res.status.should.be.equal(200);
      done();
    });
  });

  it('should reset a password', function(done) {
    var user = fixtures.users[0];
    user.id = 1;

    sandbox.mock(models.User.Instance.prototype)
    .expects('updateAttributes').once().returns(when(user));

    request(url)
    .post('auth/reset/'+ user.id + '/' + user.passwordResetKey)
    .send({ password: 'test' })
    .end(function(err, res) {
      res.status.should.be.equal(200);
      done();
    });
  });

});
