var express = require('express');
var router = express.Router();
var isAuthenticated = require('../lib/isauth');

module.exports = function(passport){

    /* GET login page. */
    router.get('/login', function(req, res) {
        // Display the Login page with any flash message, if any
        res.render('login.jade', { message: req.flash('message') });
    });

    /* Handle Logout */
    router.get('/logout', isAuthenticated,  function(req, res) {
        req.logout();
        res.redirect('/login');
    });

    // Redirect the user to the OAuth 2.0 provider for authentication.  When
    // complete, the provider will redirect the user back to the application at
    //     /auth/provider/callback

    router.get('/login/squiddio', passport.authenticate('squiddio'));

    // The OAuth 2.0 provider has redirected the user back to the application.
    // Finish the authentication process by attempting to obtain an access
    // token.  If authorization was granted, the user will be logged in.
    // Otherwise, authentication has failed.
    router.get('/login/squiddio/callback',
        passport.authenticate('squiddio', {
            successRedirect: '/home',
            failureRedirect: '/' })
    );


    /* GET Home Page */
    router.get('/home', isAuthenticated, function(req, res){
        res.render('home', { user: req.user });
    });

    //debug('Registering route: /examples');

    //app.use('/examples',  isAuthenticated, express.static(__dirname + '/../../examples'));

    router.get('/json-stream', isAuthenticated,  function(req, res){
        //app.get('/json-stream', function(req, res){
        console.log("user: "+ req.user);
        res.render('json-stream', { user: req.user });
    });

    return router;
}





