'use strict';

var ResponseHandler = require('../../api/utils/ResponseHandler');

describe('Util: ResponseHandler', function() {

  var testReq = {
    error: {},
    url: '/foo',
    method: 'POST',
    headers: {
      referer: '/bar'
    },
    params: {},
    query: {},
    body: {},
    user: {}
  };

  it('#censorData should remove any censored fields', function() {
    var data = {
      title: 'Test Title',
      password: 'test',
      hash: 'test',
      user: {
        username: 'myUsername',
        password: 'test',
        hash: 'test'
      },
      id: 1
    };
    var censoredData = ResponseHandler.censorData(data);

    censoredData.should.eql({
      title: 'Test Title',
      password: '<< CENSORED >>',
      hash: '<< CENSORED >>',
      user: {
        username: 'myUsername',
        password: '<< CENSORED >>',
        hash: '<< CENSORED >>'
      },
      id: 1
    });
  });

  it('#handleSuccess should set the Content-Length header', function() {
    var testRes = {
      setHeader: sandbox.stub(),
      status: sandbox.stub().returns({
        json: sandbox.stub()
      })
    };
    var data = {
      test: 'test'
    };
    var expectedLength = Buffer.byteLength(data, 'utf8');

    ResponseHandler.handleSuccess(testRes, 200, data);

    sinon.assert.calledOnce(testRes.setHeader);
    sinon.assert.calledWith(testRes.setHeader, 'Content-Length', expectedLength);
  });

  it('#handleSuccess should respond accordingly', function() {
    var jsonStub = sandbox.stub();
    var testRes = {
      setHeader: sandbox.stub(),
      status: function() {
        return {
          json: jsonStub
        };
      }
    };
    var statusSpy = sandbox.spy(testRes, 'status');
    var status = 200;
    var data = {
      test: 'test'
    };

    ResponseHandler.handleSuccess(testRes, status, data);

    sinon.assert.calledWith(statusSpy, status);
    sinon.assert.calledWith(jsonStub, {
      status: status,
      data: data,
      error: null
    });
  });

  it('#handleError should set the Content-Length header', function() {
    var testReq = {};
    var testRes = {
      setHeader: sandbox.stub(),
      status: sandbox.stub().returns({
        json: sandbox.stub()
      })
    };
    var error = {
      test: 'test'
    };
    var expectedLength = Buffer.byteLength(error, 'utf8');

    ResponseHandler.handleError(testReq, testRes, 400, error);

    sinon.assert.calledOnce(testRes.setHeader);
    sinon.assert.calledWith(testRes.setHeader, 'Content-Length', expectedLength);
  });

  it('#handleError should log the error', function() {
    var testRes = {
      setHeader: sandbox.stub(),
      status: function() {
        return {
          json: function() {}
        };
      }
    };
    var error = {
      test: 'test'
    };
    var loggerStub = sandbox.stub(ResponseHandler.logger, 'error');
    var originalEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = 'production';
    ResponseHandler.handleError(testReq, testRes, 400, error);

    sinon.assert.calledWith(loggerStub, {
      error: error,
      url: testReq.url,
      method: testReq.method,
      referer: testReq.headers.referer,
      params: testReq.params,
      query: testReq.query,
      body: testReq.body,
      user: testReq.user
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('#handleError should respond accordingly', function() {
    var jsonStub = sandbox.stub();
    var testReq = {};
    var testRes = {
      setHeader: sandbox.stub(),
      status: function() {
        return {
          json: jsonStub
        };
      }
    };
    var statusSpy = sandbox.spy(testRes, 'status');
    var status = 400;
    var error = {
      test: 'test'
    };

    sandbox.stub(ResponseHandler.logger, 'error');
    ResponseHandler.handleError(testReq, testRes, status, error);

    sinon.assert.calledWith(statusSpy, status);
    sinon.assert.calledWith(jsonStub, {
      status: status,
      data: null,
      error: error
    });
  });

});
