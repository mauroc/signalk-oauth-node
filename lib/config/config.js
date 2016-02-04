/*
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

module.exports = function(app) {

  "use strict";

  var path          = require('path')
    , express       = require("express")
    , EventEmitter  = require("events").EventEmitter
    , debug         = require('debug')('signalk-server:config:config')
    , cors          = require('cors')
    , config        = app.config = {}
    , env           = app.env = process.env
  ;

  app.event = new EventEmitter();
  app.use(cors());

  try {
    var pkg = require('../../package.json');

    config.name     = pkg.name;
    config.author   = pkg.author;
    config.version  = pkg.version;
  } catch(err) {
    console.error('error parsing package.json', err);
    
    config.settings = {};
    config.name     = "";
    config.author   = "";
    config.vesion   = -1;
  }

  config.appPath    = path.normalize(__dirname + '/../../');
  config.port       = env.PORT || 27065;

  if(app.overrides.port && typeof app.overrides.port === 'number') {
    debug('Port number was set using .start(), overriding all other options');
    config.port = app.overrides.port;
  }

  debug("Config - appPath: " + config.appPath);
  debug("Config - port: " + config.port);
  
  require('./development')(app);
  require('./production')(app);
  require('./cli')(app);
};