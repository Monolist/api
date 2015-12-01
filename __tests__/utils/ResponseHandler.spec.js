'use strict';

var ResponseHandler = require('../../api/utils/ResponseHandler');

describe('Util: ResponseHandler', function() {

  it('#handleSuccess should respond accordingly', function() {
    var jsonStub = sandbox.stub();
    var testRes = {
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

  it('#handleError should log the error', function() {
    var testRes = {
      status: function() {
        return {
          json: function() {}
        };
      }
    };
    var testReq = {
      ip: 'test'
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
      request: testReq
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('#handleError should respond accordingly', function() {
    var jsonStub = sandbox.stub();
    var testReq = {
      ip: 'test'
    };
    var testRes = {
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