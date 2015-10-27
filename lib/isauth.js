

module.exports= function (req, res, next) {
    // if user is authenticated in the session, call the next() to call the next request handler
    // Passport adds this method to request object. A middleware is allowed to add properties to
    // request and response objects

    console.log("authenticated? ");
    console.log(req.isAuthenticated());


    if (req.isAuthenticated())
        return next();

    // if the user is not authenticated then redirect him to the login page
    req.flash('error', 'This is an authenticated request. Please log in');
    res.redirect('/login');
}