'use strict';

const cluster = require('abacus-cluster');
const webapp = require('abacus-webapp');
const path = require('path');
const bodyParser = require('body-parser');
const passport = require('passport');
const lib = require('./utils');
const routes = lib.routes;
const middleware = lib.middleware;
const config = require('./utils/config');
const authenticator = require('./middleware/authMiddleware');
const controller = require('./controllers').cfApi;
const authCtrl = require('./auth');
const express = require('express');

const debug = require('abacus-debug')('abacus-dashboard');

const startDashboard = () => {
  debug('Starting dasboard');
  controller.getInfo().then((result) => {
    let response = result.body;
    config.cf.authorize_url = `${response.authorization_endpoint}/oauth/authorize`;
    config.cf.token_url = `${response.token_endpoint}/oauth/token`;
    debug('passport strategy called');
    let strategy = authCtrl.passportStrategy();
    passport.use(strategy);
  });

};

const dashboard = () => {
  debug('Starting Dashboard App');
  cluster.singleton();
  if (cluster.isWorker()) {
    debug('Starting dashboard worker app');
    startDashboard();
  }

  const app = webapp();
  app.set('case sensitive routing', true);
  app.set('env', process.env.NODE_ENV || 'development');
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
  app.use(express.static(__dirname + '/webapp'));
  app.use(require('express-session')({
    saveUninitialized: false,
    resave: false,
    secret: config.cf.cookie_secret,
    key: 'JSESSIONID',
    cookie: {
      secure: 'auto'
    }
  }));
  app.enable('trust proxy');
  app.use(passport.initialize());
  app.use(passport.session());
  app.set('views', path.join(__dirname, 'webapp/views'));
  app.set('view engine', 'pug');
  app.use('/v1', routes.cfAbacus);
  app.use('/manage/instances', routes.ui);
  // protect non-functional routes also
  app.use('/*', authenticator.ensureAuthenticated);
  app.use(middleware.notFound());
  // error handler
  app.use(middleware.error({
    formats: [
      'json',
      'text',
      'html'
    ]
  }));
  return app;
};

// Command line interface, create the broker app and listen
const runCLI = () => dashboard().listen();

// Export our public functions
module.exports = dashboard;
module.exports.runCLI = runCLI;
