'use strict';
/* eslint-disable max-len*/
require('./lib/index.js');
const controller = require('../controllers').cfApi;
const config = require('../utils/config');
const sharedDomains = require('./fixtures/shared_domains.json');
const serviceBindings = require('./fixtures/service_bindings.json');
const Promise = require('bluebird');
const _ = require('lodash');
const req = {
  'params': {
    'instance_id': 'test-instance'
  },
  'session': {
    'uaa_response': {
      'access_token': 'abcd1234'
    }
  },
  'sessionStore': {
    'refreshToken': 'abcd'
  },
  'query': {
    'quota_def_url': '/test',
    'key': 'test'
  }
};
let controllerSpy;
describe('lib', () => {
  describe('controllers', () => {
    describe('cfApiController', () => {

      describe('test user permission call', () => {
        beforeEach(() => {
          controllerSpy = sinon.spy(controller, 'checkUserPermissionAndProceed');
        });
        afterEach(() => {
          controllerSpy.restore();
          nock.cleanAll();
        });

        it('calls cloud controller to check user permissions and succeed', (done) => {
          nock(config.cf.cf_api_endpoint)
            .get('/v2/service_instances/test-instance/service_bindings')
            .reply(() => {
              return [200, serviceBindings];
            });

          nock(config.cf.cf_api_endpoint)
            .get('/v2/shared_domains')
            .reply(() => {
              return [200, sharedDomains];
            });
          nock(config.cf.token_url)
            .post('').reply(() => {
              return [200, {
                'access_token': 'accessToken'
              }];
            });
          nock(config.cf.cf_api_endpoint)
            .get('/v2/service_instances/test-instance/permissions')
            .reply(() => {
              return [200, { manage: true }];
            });
          Promise.try(() => {
            return controller.checkUserPermissionAndProceed(req);
          }).then(() => {
            expect(nock.isDone, true);
            expect(controllerSpy.calledOnce).to.equal(true);
            expect(controllerSpy.threw()).to.equal(false);
            done();
          });
        });

        it('calls cloud controller to check user permissions and returns false', (done) => {
          nock(config.cf.cf_api_endpoint)
            .get('/v2/service_instances/test-instance/permissions')
            .reply(() => {
              return [200, { manage: false }];
            });
          Promise.try(() => {
            return controller.checkUserPermissionAndProceed(req);
          }).catch((e) => {
            chai.assert(e.message, 'Missing dashboard permission');
            done();
          });
        });
      });

      describe('test user permission call return 400', () => {
        before(() => {
          nock.cleanAll();
          controllerSpy = sinon.spy(controller, 'checkUserPermissionAndProceed');
          nock(config.cf.cf_api_endpoint)
            .get('/v2/service_instances/test-instance/permissions')
            .reply(400);
        });

        after(() => {
          nock.cleanAll();
          controllerSpy.restore();
        });

        it('calls cloud controller to check user permissions and returns 400', (done) => {
          Promise.try(() => {
            return controller.checkUserPermissionAndProceed(req);
          }).catch((e) => {
            chai.assert(e.status, 400);
            done();
          });
        });
      });

      describe('shared domains', () => {
        let sharedDomainsStub = null;
        beforeEach(() => {
          nock.cleanAll();
          sharedDomainsStub = sinon.stub(controller, 'getSharedDomainsCall', () => {
            return Promise.resolve();
          });
          controllerSpy = sinon.spy(controller, 'getServiceBinding');
          nock(config.cf.cf_api_endpoint)
            .get('/v2/service_instances/test-instance/service_bindings')
            .reply(() => {
              return [200, serviceBindings];
            });
          nock(config.cf.token_url)
            .post('/').reply(() => {
              return [200, {
                'access_token': 'accessToken'
              }];
            });
        });

        afterEach(() => {
          controllerSpy.restore();
          sharedDomainsStub.restore();
          controllerSpy.restore();
          nock.cleanAll();
        });

        it('calls cloud controller to get shared domains success', (done) => {
          Promise.try(() => {
            return controller.getSharedDomainsCall(req);
          }).then(() => {
            expect(nock.isDone, true);
            done();
          });
        });
      });

      describe('test service bindings with failure', () => {
        let serviceBindingSpy;
        beforeEach(() => {
          serviceBindingSpy = sinon.spy(controller, 'getServiceBinding');
          nock(config.cf.cf_api_endpoint)
            .get('/v2/service_instances/test-instance/service_bindings')
            .reply(() => {
              return [200, serviceBindings];
            });
          nock(config.cf.token_url)
            .post('/').reply(() => {
              return [400, {
              }];
            });
        });

        afterEach(() => {
          serviceBindingSpy.restore();
          nock.cleanAll();
        });

        it('should fail with 500 error', (done) => {
          Promise.try(() => {
            return controller.getServiceBinding(req);
          }).catch((e) => {
            expect(nock.isDone,true);
            expect(e).to.have.status(500);
            done();
          });
        });
      });



      describe('test service bindings call', () => {
        let sharedDomainsStub;
        beforeEach(() => {
          nock.cleanAll();
          sharedDomainsStub = sinon.stub(controller, 'getSharedDomainsCall', () => {
            return Promise.resolve();
          });
          controllerSpy = sinon.spy(controller, 'getServiceBinding');
        });
        afterEach(() => {
          controllerSpy.restore();
          sharedDomainsStub.restore();
          controllerSpy.restore();
          nock.cleanAll();

        });



        it('should test service binding with empty resources and throw 404', (done) => {
          nock(config.cf.cf_api_endpoint)
            .get('/v2/service_instances/test-instance/service_bindings')
            .reply(200, { resources: [] });
          Promise.try(() => {
            return controller.getServiceBinding(req);
          }).catch((e) => {
            chai.assert.equal(e.message, 'Unable to find resource provider');
            expect(e).to.have.status(404);
            done();
          });

        });

        it('calls cloud controller service bindings and get 401', (done) => {
          nock(config.cf.cf_api_endpoint)
            .get('/v2/service_instances/test-instance/service_bindings')
            .reply(401);
          Promise.try(() => {
            return controller.getServiceBinding(req);
          }).catch((e) => {
            expect(e).to.have.status(401);
            done();
          });
        });
      });

      describe('test shared domains call', () => {
        let lodashEmptySpy;
        beforeEach(() => {
          controllerSpy = sinon.spy(controller, 'getSharedDomainsCall');
          lodashEmptySpy = sinon.stub(_, 'isEmpty');
        });

        afterEach(() => {
          controllerSpy.restore();
          lodashEmptySpy.restore();
        });

        it('should call shared domains and succeed', (done) => {
          lodashEmptySpy.returns(true);
          nock(config.cf.cf_api_endpoint)
            .get('/v2/shared_domains')
            .reply(() => {
              return [200, sharedDomains];
            });
          controller.getSharedDomainsCall(req);
          expect(controllerSpy.calledOnce).to.equal(true);
          done();
        });

        it('should call shared domains gets 400 but return 500', (done) => {
          lodashEmptySpy.returns(true);
          nock(config.cf.cf_api_endpoint)
            .get('/v2/shared_domains')
            .reply(401);
          Promise.try(() => {
            return controller.getSharedDomainsCall(req);
          }).catch((e) => {
            expect(controllerSpy.calledOnce).to.equal(true);
            expect(e).to.have.status(500);
            done();
          });
        });
      });

      describe('test getInfo call', () => {
        beforeEach(() => {
          controllerSpy = sinon.spy(controller, 'getInfo');
          nock(config.cf.cf_api_endpoint)
            .get('/v2/info')
            .reply(() => {
              return [200, {}];
            });
        });

        afterEach(() => {
          nock.cleanAll();
        });

        it('should getinfo call', (done) => {
          Promise.try(() => {
            return controller.getInfo();
          }).then((res) => {
            expect(nock.isDone, true);
            expect(controllerSpy.calledOnce).to.equal(true);
            done();
          });
        });
      });
    });
  });
});
