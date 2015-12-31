var express = require('express');
var router = express.Router();
var isAuthenticated = require('../lib/isauth');
var auth_req = require('../lib/auth_req');

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

    // The sQuidd.io OAuth 2.0 provider has redirected the user back to the application.
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
console.log("wsServer  "+wsServer)
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
        var id  = req.params["id"]  ;
        auth_req(req, res, authServer+"/signalk/api/v1/vessels/"+id+"/navigation");
    });

    router.get("/resources/:id/waypoints",  function(req, res){
        var id  = req.params["id"] || 0 ;
        auth_req(req, res, authServer+"/signalk/api/v1/resources/"+id+"/waypoints");
    });

    router.get("/swagger_doc",  function(req, res){
        // todo: implement this
        auth_req(req, res, authServer+"/signalk/api/v1/swagger_doc");

    });

    return router;
};





