process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"   // Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs

//var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var SquiddioStrategy = require('../node_modules/passport-squiddio/lib/index').Strategy;
var User = require('../models/user');


module.exports = function(passport) {
    passport.use('squiddio', new SquiddioStrategy({
            authorizationURL: 'https://localhost:9000/oauth/authorize',
            tokenURL:       'https://localhost:9000/oauth/token',
            clientID:       '748a168a0398d039bfdc815de23852e5483b2ac23040b2f55344e4087b89a273',
            clientSecret:   '6fa789acd6d70777b92eec2dc6900ab3b3fc31d24bd1c87ef4e914b6fc9ab39d',
            //callbackURL:    'https://localhost:3000/login/squiddio/callback'
            callbackURL:    'http://localhost:3000/login/squiddio/callback'
        },
        function(accessToken, refreshToken, params, profile, done) {

            console.log('profile: ', profile);
            console.log('params: ', params);

            // asynchronous
            process.nextTick(function() {

                User.findOne({ 'squiddio.id' : profile.id } , function(err, user) {

                    // if there is an error, stop everything and return that
                    // ie an error connecting to the database

                    if (err)
                        return done(err);

                    // if the user is found then log them in
                    if (user) {
                        return done(null, user); // user found, return that user
                    } else {
                        // if there is no user, create them
                        var newUser                 = new User();

                        // set all of the user data that we need
                        newUser.squiddio.id             = profile.id;
                        newUser.squiddio.token          = accessToken;
                        newUser.squiddio.tokenExpires   = Math.floor(new Date().getTime()/1000) + params.expires_in;
                        newUser.squiddio.email          = profile.email;
                        newUser.squiddio.firstName      = profile.firstName;
                        newUser.squiddio.lastName       = profile.lastName;

                        // save our user into the database
                        newUser.save(function(err) {
                            if (err)
                                throw err;
                            return done(null, newUser);
                        });
                    }


                    done(err, user);
                });
            });
        }
    ));


}

