/*
 * Copyright 2015 Mauro Calvi <coupdemistral@gmail.com>
 * Copyright 2014-2015 Fabian Tollenaar <fabian@starting-point.nl>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

var express = require('express'),
  _ = require('lodash'),
  debug = require('debug')('signalk-server'),
  path = require('path'),
  http = require('http'),
  https = require('https'),
  pem = require('pem'),
  fs = require('fs'),
  FullSignalK = require('signalk-schema').FullSignalK;

// squiddio setup
var favicon = require('static-favicon')
    , logger = require('morgan')
    , cookieParser = require('cookie-parser')
    , bodyParser = require('body-parser')
    , mongoose = require('mongoose')
    , passport = require('passport')
    , expressSession = require('express-session')
    , flash = require('connect-flash')
    , initPassport = require('../passport/init')
    , routes = require('../routes/index')(passport)
    , url = require('url')
;

GLOBAL.oauthSettings = require('../settings/oauth-settings.json');
oauthSettings.localHost = url.parse(oauthSettings.callbackURL).host;

console.log("\nauth server: "+oauthSettings.authServer);
console.log("callback url: "+oauthSettings.callbackURL);
console.log("local storage: "+oauthSettings.localStorage);
console.log("server ID: "+oauthSettings.clientID+"\n");

// Connect to DB
mongoose.connect(oauthSettings.localStorage);

function Server(opts) {
  this.params = opts || {};
  this.app = express();
  this.app.started = false;

  this.app.overrides = {
    settings: this.params.settings || null,
    port: this.params.port || null
  };
  var app = this.app;

  require('./config/config')(app);

  app.signalk = new FullSignalK(app.selfId, app.selfType);

  //app.signalk     = new Multiplexer(app.selfId, app.selfType);
    // squiddio setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'jade');

    app.use(favicon());
    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(expressSession({secret: 'mySecretKey', cookie: { maxAge : oauthSettings.sessionDuration*1000 } }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(flash());
    app.use('/', routes);


    initPassport(passport);

}
module.exports = Server;

Server.prototype.start = function() {
  var self = this;
  var app = this.app;

  createServer(app, function(err, server) {
    app.server = server;
    app.interfaces = {};
    app.connections = {};
    app.clients = 0;

    debug("ID type: " + app.selfType);
    debug("ID: " + app.selfId);

    startInterfaces(app);
    startMdns(app);
    app.providers = require('./pipedproviders')(app).start();

    server.listen(app.config.port, function() {
      console.log('signalk-server running at 0.0.0.0:' + app.config.port + "\n");
      app.started = true;
    });
  })
};

function createServer(app, cb) {
  if (app.config.settings.ssl) {
    getCertificateOptions(function(err, options) {
      cb(null, https.createServer(options, app));
    });
    return;
  };
  var server;
  try {
    server = http.createServer(app);
  } catch (e) {
    cb(e);
    return;
  }
  cb(null, server);
}

function getCertificateOptions(cb) {
  try {
    if (fs.statSync('./settings/ssl-key.pem').isFile() && fs.statSync('./settings/ssl-cert.pem')) {
      debug("Using certificate ssl-key.pem and ssl-cert.pem in ./settings/");
      cb(null, {
        key: fs.readFileSync('./settings/ssl-key.pem'),
        cert: fs.readFileSync('./settings/ssl-cert.pem')
      });
      return;
    }
  } catch (e) {
    createCertificateOptions(cb);
  }
}

function createCertificateOptions(cb) {
  debug("Creating certificate files in ./settings/");
  pem.createCertificate({
    days: 360,
    selfSigned: true
  }, function(err, keys) {
    fs.writeFile('./settings/ssl-key.pem', keys.serviceKey);
    fs.writeFile('./settings/ssl-cert.pem', keys.certificate);
    cb(null, {
      key: keys.serviceKey,
      cert: keys.certificate
    })
  });
}

function startMdns(app) {
  if (_.isUndefined(app.config.settings.mdns) || app.config.settings.mdns) {
    debug("Starting interface 'mDNS'");
    try {
      app.interfaces['mdns'] = require('./mdns')(app);
    } catch (ex) {
      debug("Could not start mDNS:" + ex);

    }
  } else {
    debug("Interface 'mDNS' was disabled in configuration");
  }
}

function startInterfaces(app) {
  debug("Interfaces config:" + JSON.stringify(app.config.settings.interfaces));
  var availableInterfaces = require('./interfaces');
  _.forIn(availableInterfaces, function(interface, name) {
    if (_.isUndefined(app.config.settings.interfaces) ||
      _.isUndefined(app.config.settings.interfaces[name]) ||
      app.config.settings.interfaces[name]) {
      debug("Loading interface '" + name + "'");
      app.interfaces[name] = interface(app);
      if (app.interfaces[name] && _.isFunction(app.interfaces[name].start)) {
        debug("Starting interface '" + name + "'");
        app.interfaces[name].start();
      }
    } else {
      debug("Not loading interface '" + name + "' because of configuration");
    }
  });
}

Server.prototype.reload = function(mixed) {
  var settings, self = this;

  if (typeof mixed === 'string') {
    try {
      settings = require(path.join(process.cwd(), mixed));
    } catch (e) {
      debug("Settings file '" + settings + "' doesn't exist.");
    }
  }

  if (mixed !== null && typeof mixed === 'object') {
    settings = mixed;
  }

  if (settings) {
    this.app.config.settings = settings;
  }

  this.stop();

  setTimeout(function() {
    self.start();
  }, 1000);

  return this;
};

Server.prototype.stop = function() {
  if (this.app.started === true) {
    _.each(this.app.interfaces, function(intf) {
      if (intf !== null && typeof intf === 'object' && typeof intf.stop === 'function') {
        intf.stop();
      }
    });

    debug("Closing server...");

    this.app.server.close(function() {
      debug("Server closed...");
      this.server = null;
    });

    for (var id in this.app.connections) {
      if (this.app.connections.hasOwnProperty(id)) {
        debug("Closing connection #" + id);
        this.app.connections[id].destroy();
        delete this.app.connections[id];
      }
    }

    this.app.started = false;
  }

  this.app.providers.forEach(function(providerHolder) {
    providerHolder.pipeElements[0].end();
  });

  return this;
};
