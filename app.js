// Secrets Web App - using level 6 Authentication with Google OAuth 2.0 Social Sign-In Strategy 


// require and configure dotenv needed for an environment-specific variable
require('dotenv').config(); // needs to be required as early as possible

// create a listening port
const port = 3000;

// require modules (packages)
const express = require("express"); // express
const ejs = require("ejs"); // ejs
const mongoose = require("mongoose"); // mongoose
const session = require("express-session"); // session
const passport = require("passport"); // passport
const passportLocalMongoose = require("passport-local-mongoose"); // passport-local-mongoose
const GoogleStrategy = require("passport-google-oauth20").Strategy; // google oauth
const findOrCreate = require("mongoose-findorcreate"); // User.findOrCreate()


// create a new application that uses express
const app = express();

// set view engine to use EJS templating 
app.set("view engine", "ejs"); // a path to views folder containing ejs files

// parse the URL-encoded body of requests
app.use(express.urlencoded({extended: true})); 
// use public folder to store static files (such as images and css code) 
app.use(express.static("public")); 

// set up and use express-session
app.set('trust proxy', 1) // trust first proxy 
app.use(session({
    secret: 'A secret session',
    resave: false, // true recommended by documentation 
    saveUninitialized: false, // // true recommended by documentation 
    cookie: { secure: true }
  }));

// initialize and use passport
app.use(passport.initialize());
app.use(passport.session()); // use passport to manage session 

// allow mongoose to connect to a local mongoDB instance (userDB)
mongoose.connect("mongodb://localhost:27017/userDB",  
                    {useNewUrlParser: true, useUnifiedTopology: true}); 
// needed to get rid of deprecation warning
mongoose.set("useCreateIndex", true);

// create a new object from the mongoose Schema class that holds the email and password fields
const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String, // needed for identifying users (who logged in via google) in order to find them locally (database) 
    secret: String // needed for saving submitted secrets
}); 

// use plugin for hashing/salting passwords and storing them in the mongoose db
userSchema.plugin(passportLocalMongoose);
// add package as a plugin to Schema
userSchema.plugin(findOrCreate); 

// create users (which will be added to userDB) via the mongoose Model based on userSchema
const User = mongoose.model("User", userSchema); // "User" becomes "users" behind the scenes

// use "createStrategy" INSTEAD OF "authenticate" 
passport.use(User.createStrategy()); // create a local login strategy

// use passport to serialize user instances to and from the session (unique cookie to support the login session)
passport.serializeUser(function(user, done) { // supports all strategies 
    done(null, user.id);
});
// use passport to deserialize user instances to and from the session 
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});


// configure strategy (Google OAUTH 2.0) when using passport
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID, // GOOGLE_CLIENT_ID
    clientSecret: process.env.CLIENT_SECRET, // GOOGLE_CLIENT_SECRET
    callbackURL: "http://localhost:3000/auth/google/secrets", // ".../auth/google/callback"
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo" 
  },
  // once google authentication has completed this callback function gets triggered 
  function(accessToken, refreshToken, profile, cb) { 
    // not a real mongoose function -> must require 'mongoose-findorcreate' 
    // to implement psuedo code in order to find/create a user in database
    User.findOrCreate({ googleId: profile.id }, function (err, user) { // find/create users in database
      return cb(err, user);
    });
  }
));

// GET request for the home route
app.get("/", function(req, res) {
    res.render("home");
});

// GET request for the google authentication route
app.get("/auth/google",
    // initiate authentication on google's servers asking for user profile once logged in
    passport.authenticate("google", { scope: ["profile"] }) // google handles the authentication at this stage
);

// authorized redirect url - google will redirect user to this route after successful auhentication
app.get("/auth/google/secrets",
    // use passport to authenticate users using the google strategy (authentication is handled locally)
    passport.authenticate("google", { failureRedirect: "/login" }), // redirect to login route if authentication fails
    // call-back function
    function(req, res) {
        // successful authentication, redirect to secrets page
        res.redirect("/secrets"); // will trigger callback function in passport.use() - line 82
    });


// GET request for the login route
app.get("/login", function(req, res) {
    res.render("login");
});


// POST request for the login route
app.post("/login", function(req, res) {
    // create a new user from the mongoose model with a username and password
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
      // use passport's login() function to establish a login session 
      req.login(user, function(err) { // use callback function to handle errors
        // if there are any errors
        if (err) {
            // log errors
            console.log(err);
        }
        // if there aren't any errors
        else {
            // use passport to authenticate the user via a local strategy 
            passport.authenticate("local")(req, res, function() {
                // callback is only triggered if authentication is successful
                res.redirect("/secrets"); // redirect to the secrets route 
            });
        }
    });
});   


// GET request for the register route
app.get("/register", function(req, res) {
    res.render("register");
});


// POST request for the register route (triggers when user clicks submit in the form)
app.post("/register", function(req, res) {
    // use Passport-Local Mongoose to register users and add a callback function to handle errors
    User.register({username: req.body.username}, req.body.password, function(err, user) {
        // if there are any errors
        if (err) {
            console.log(err); // log errors 
            // redirect to the register route so the user can try again
            res.redirect("/register"); 
        }
        // if there aren't any errors
        else {
            // use passport to authenticate user (authenticaton type is local)
            passport.authenticate("local")(req, res, function() { 
// callback is only triggered if authentication is successful (manage to set up a cookie that saves the user login session)
                res.redirect("/secrets"); // redirect to the secrets route 
            });
        }
    });    
});


// GET request for the secrets route
app.get("/secrets", function(req, res) {
    // search the database (collection of users) and find all the secrets already submitted (check for secret fields that are not null) 
    User.find({"secret": {$ne: null}}, function(err, foundUsers) { // handle errors with a callback function
        // if there are any errors
        if(err) {
            console.log(err); // log the error(s)
        } 
        // but if no errors are found 
        else {
            // and if any users are found
            if(foundUsers) {
                // render the secrets.ejs page using the values from the found users
                res.render("secrets", {usersWithSecrets: foundUsers}); 
            }
        }
    });
});
  
  
// GET request for the submit route
app.get("/submit", function(req, res){
    // check if user is logged in
    if (req.isAuthenticated()) {
        // if user is logged in, render the submit page
        res.render("submit");
    } 
    // if user is not logged in, redirect to login page
    else {
        res.redirect("/login");
    }
});
  

// POST request for the submit route 
app.post("/submit", function(req, res) {
    // access submit.ejs and store the secret that user submits via in form   
    const submittedSecret = req.body.secret;
    
    // find the current user in database by their id and handle errors with a callback function
    User.findById(req.user.id, function(err, foundUser) {  
        // if there is an error
        if(err) {
            console.log(err); // log the error
        } 
        // otherwise, look for the user
        else {
            // if there is match
            if(foundUser) {
                // assign the submitted secret to the found user's secret field (part of the Schema)  
                foundUser.secret = submittedSecret;
                // save the found user with their newly updated secret 
                foundUser.save(function() { // and once the save is complete 
                    res.redirect("/secrets"); // redirect to the secrets page
                });
            }
        }
    });
});


// GET request for the logout route
app.get("/logout", function(req, res) {
    req.logout(); // de-authenticate user and end user session by logging out 
    res.redirect("/"); // go back to home route
});


// port listening 
app.listen(port, function() {
    console.log("Server started on port 3000");
});


