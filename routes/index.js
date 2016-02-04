/*
 /*
 * Copyright 2015 Mauro Calvi <coupdemistral@gmail.com>
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

var express = require('express');
var router = express.Router();
var isAuthenticated = require('../lib/isauth');
var auth_get = require('../lib/auth_get');
var auth_post = require('../lib/auth_post');
var isOnline = require('is-online');

var authServer = require('../settings/oauth-settings.json')["authServer"];

module.exports = function(passport){

    /* GET login page. */
    router.get('/login', function(req, res) {
        // Display the Login page with any flash message, if any
        isOnline(function(err, online) {
            if (online) {
                res.render('login.jade', { message:req.flash('error') });
            } else {
                res.json({error: 'Sorry, login not possible at this time: the server is not connected to the Internet'});
            }
        });
    });

    /* Handle Logout */
    router.get('/logout', isAuthenticated,  function(req, res) {
        req.logout();
        res.redirect('/login');
    });

    // Redirect the user to the sQuidd.io OAuth 2.0 provider for authentication.  When
    // complete, the provider will redirect the user back to the application at
    //     /auth/provider/callback

    router.get('/login/squiddio', passport.authenticate('squiddio'));

    // The sQuiddio OAuth 2.0 provider has redirected the user back to the application.
    // Finish the authentication process by attempting to obtain an access
    // token.  If authorization was granted, the user will be logged in.
    // Otherwise, authentication has failed.
    router.get('/login/squiddio/callback',
        passport.authenticate('squiddio', {
            successRedirect: '/home',
            failureRedirect: '/' })
    );

    router.get('/', function(req, res){
        res.render('home', { user: req.user, host: req.hostname });
    });

    router.get('/home', function(req, res){
        res.render('home', { user: req.user, host: req.hostname });
    });

    router.get('/websocket-demo', function(req, res){
        // res.query["wssserver"] indicates if webstream is to be sourced from localhost or squidd.io. It can be passed
        // as a parameter to /websocket-demo. If none, the current host is used.
        var wsServer = req.query["wsserver"] || req.headers.host ;
        res.render("websocket-demo", { user: req.user, wsServer: wsServer });
    });

    router.get("/api_example_1",  function(req, res){
        // all vessels in the database (limited at 200).Response will include vessels
        // 1) that belong to a sQuiddio user and have an MMSI
        // 2) that do no belong to a sQuiddio user but periodically advertise themselves on
        // the AisHub network through message type 5 (in other words, the response may not be inclusive of all AIS vessels)
        auth_get(req, res, authServer+"/signalk/api/v1/vessels/");
    });

    router.get("/api_example_2", function(req, res){
        // all information for vessel Self. Note that Self is the vessel associated with the clientID specified in settings/oauth-settings.json
        // (aka Host Vessel), not the sQuiddio boat of the user currently logged in (Guest)
        auth_get(req, res, authServer+"/signalk/api/v1/vessels/self");
    });

    router.get("/api_example_3", function(req, res){
        // information for all vessels with an MMSI starting with 215 (Malta - limited to 200 records). See note for example_1
        auth_get(req, res, authServer+"/signalk/api/v1/vessels/imo:mmsi:215*");
    });

    router.get("/api_example_4", function(req, res){
        // navigation information for all vessels in the Host Vessel's owner sQuiddio follow list. See https://squidd.io/faq#follow for more information.
        // If the Host Vessel's owner doesn't have a follow list set up on sQuiddio, only vessel in response will be Self
        auth_get(req, res, authServer+"/signalk/api/v1/vessels/self/navigation?friends=true" );
    });

    router.get("/api_example_5", function(req, res){
        // navigation information for all vessels in the range of 20km of Self's latest reported position. Response will return an error if
        // no position has been reported by Self. Update position manually at http://squidd.io/positions/new or use AIS, Spot Tracker, OpenCPN sQuiddio plugin etc. to
        // report positions automatically. Or use the POST example below (api_example_8). "Range" is defined as an approximate box of 20x20 kms around the reference position.
        // See https://squidd.io/faq#follow for more information.
        auth_get(req, res, authServer+"/signalk/api/v1/vessels/self/navigation?within_range=20" );
    });

    router.get("/api_example_6",  function(req, res){
        // Destination ("waypoint") information for sQuiddio destinations in the State of California.
        auth_get(req, res, authServer+"/signalk/api/v1/resources/waypoints/country/US?region_code=CA");
    });

    router.get("/api_example_7",  function(req, res){
        // Destination ("waypoint") information for sQuiddio destinations within a range of 20 km of Self's latest reported position. See note at
        // api_example_5 regarding reporting positions to sQuiddio.
        auth_get(req, res, authServer+"/signalk/api/v1/resources/waypoints/vessels/self?within_range=20" );
    });

    router.get("/api_example_8",  function(req, res){
        // POST sample navigation data to the guest user's sQuiddio account. Note: this creates an actual log post on sQuiddio and will be visible in the guest user's dashboard, shared
        // with users in the guest user's Follow list (OpenCPN plugin etc).
        req.body = {latitude: 37.864, longitude:  -122.491 , sog: 2.0, heading: 275 };
        auth_post(req, res, authServer+"/signalk/api/v1/vessels/navigation/position.json" );
    });

    //************** more information on sQuiddio APIs at the interactive API console http://squidd.io/api_docs or at the json discovery url http://squidd.io/signalk *****************

    return router;
};





