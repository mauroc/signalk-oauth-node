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
var auth_req = require('../lib/auth_req');
var qs = require('qs');

var authServer = require('../settings/oauth-settings.json')["authServer"];

module.exports = function(passport){


    /* GET login page. */
    router.get('/login', function(req, res) {
        // Display the Login page with any flash message, if any
        res.render('login.jade', { message:req.flash('error') });
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
        res.render('home', { user: req.user });
    });

    router.get('/home', function(req, res){
        res.render('home', { user: req.user });
    });

    router.get('/websocket-demo', function(req, res){
        // res.query["wssserver"] indicates if webstream is to be sourced from localhost or squidd.io. It can be passed
        // as a parameter to /websocket-demo. If none, the current host is used.
        var wsServer = req.query["wsserver"] || req.headers.host ;
        res.render("websocket-demo", { user: req.user, wsServer: wsServer });
    });

    router.get("/vessels",  function(req, res){
        auth_req(req, res, authServer+"/signalk/api/v1/vessels/");
    });

    router.get("/vessels/:id", function(req, res){
        var id  = req.params["id"]  ;
        auth_req(req, res, authServer+"/signalk/api/v1/vessels/"+id);
    });

    router.get("/vessels/:id/navigation", function(req, res){
        // navigation data for :id vessel.
        var id  = req.params["id"]  ;
        auth_req(req, res, authServer+"/signalk/api/v1/vessels/"+id+"/navigation");
    });

    router.get("/resources/:id/waypoints",  function(req, res){
        // show list of squiddio waypoints near own vessel's current position
        var id  = req.params["id"] || 0 ;
        console.log(req.query);
        auth_req(req, res, authServer+"/signalk/api/v1/resources/waypoints/vessels/"+id);
    });

    return router;
};





