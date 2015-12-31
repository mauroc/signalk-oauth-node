process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"   // Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs

var SquiddioStrategy = require('../node_modules/passport-squiddio/lib/index').Strategy;
var User = require('../models/user');


module.exports = function(passport) {
    passport.use('squiddio', new SquiddioStrategy( GLOBAL.oauthSettings,
        function(accessToken, refreshToken, params, profile, done) {

            process.nextTick(function() {

                User.findOne({ 'squiddio.id' : profile.id } , function(err, user) {

                    // if there is an error, stop everything and return that
                    // ie an error connecting to the database

                    if (err)
                        return done(err);

                    // if the user is found then log them in
                    if (!user)  {

                        // if access is restricted, verify that user is in sQuiddio follow list. If there is no user, create one
                        if (!oauthSettings.friendsOnly || (oauthSettings.friendsOnly== 1 && profile.isFriend == true)) {
                            var newUser                 = new User();

                            // set all of the user data that we need
                            newUser.squiddio.id             = profile.id;
                            newUser.squiddio.token          = accessToken;
                            newUser.squiddio.email          = profile.email;
                            newUser.squiddio.firstName      = profile.firstName;
                            newUser.squiddio.lastName       = profile.lastName;
                            newUser.squiddio.isFriend       = profile.isFriend;
                            newUser.squiddio.boat.id        = profile.boat.id;
                            newUser.squiddio.boat.name      = profile.boat.name;
                            newUser.squiddio.boat.mmsi      = profile.boat.mmsi;
                            newUser.tokenExpires            = Math.floor(new Date().getTime()/1000) + params.expires_in;

                            // save our user into the database
                            newUser.save(function(err) {
                                if (err)
                                    throw err;
                                return done(null, newUser);
                            });
                        } else {return done('Access to this SignalK server is restricted. Contact the administrator and ask to be added to his/her sQuiddio follow list.')}
                    } else {
                        return done(null, user); // user found, return that user
                    }

                });
            });
        }
    ));


}

