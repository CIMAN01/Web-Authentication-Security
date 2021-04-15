// Secrets Web App - Authentication 

// Not requiring all packages (modules) for this application. 
// Refer to package.json to see which dependencies are used for this project.

// require and configure dotenv needed for an environment-specific variable
require('dotenv').config(); // needs to be required as early as possible

// create a listening port
const port = 3000;

// require modules (packages)
const https = require("https"); // https
const { dirname } = require("path"); // path
const _ = require("lodash"); // lodash
const express = require("express"); // express
const ejs = require("ejs"); // ejs
const mongoose = require("mongoose"); // mongoose
//const encrypt = require("mongoose-encryption"); // mongoose encryption
//const md5 = require("md5"); // hash function (a weak hashing algorithm)
//const bcrypt = require("bcrypt"); // bcrypt hash function 
//const saltRounds = 10; // salt rounds
const session = require("express-session"); // session
const passport = require("passport"); // Passport
//const passportLocal = require("passport-local"); // not needed (redundant)
const passportLocalMongoose = require("passport-local-mongoose"); 


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
    password: String
}); 

// use plugin for hashing/salting passwords and storing them in the mongoose db
userSchema.plugin(passportLocalMongoose);

// create users (which will be added to userDB) via the mongoose Model based on userSchema
const User = mongoose.model("User", userSchema); // "User" becomes "users" behind the scenes

// use "createStrategy" INSTEAD OF "authenticate" (simplified config)
passport.use(User.createStrategy()); // create a local login strategy
// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// GET request for the home route
app.get("/", function(req, res) {
    res.render("home");
});

// GET request for the login route
app.get("/login", function(req, res) {
    res.render("login");
});

// GET request for the register route
app.get("/register", function(req, res) {
    res.render("register");
});

// GET request for the secrets route
app.get("/secrets", function(req, res) {
    // if user is authenticated
    if (req.isAuthenticated()) {
        // reveal secrets page
        res.render("secrets");
    }
    // if user is not authenticated
    else {
        // make the user login first before accessing secrets page
        res.redirect("/login"); // redirect to login route
    }
});
  
// GET request for the logout route
app.get("/logout", function(req, res) {
    req.logout(); // de-authenticate user and end user session by logging out 
    res.redirect("/"); // go back to home route
});

/*
// POST request for the register route (triggers when user clicks submit in the form)
app.post("/register", function(req, res) {
    // use bcrypt as a hashing function and include rounds of salting 
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) { // callback for hashing
        // create a mongoose Document for each new user based on the Model
        const newUser =  new User({ // create a new user 
          email: req.body.username, 
          password: hash // req.body.password -> hash & myPlaintextPassword -> req.body.password
        });
        // *** during save, documents are encrypted and then signed by Mongoose ***
        // save the document to database (save new user) 
        newUser.save(function(err) { // add callback function to handle any errors
            // if save is unsuccessful 
            if (err) {
                // log the error(s)
                console.log(err);
            } 
            // if save is successful
            else {
                // users can only access secrets page via a successful login/registration
                res.render("secrets"); // redirect to secrets page
            }
        });
    });
});
*/

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


/*
// POST request for the login route
app.post("/login", function(req, res) {
    // grab and store (body-parse) username/password fields from the form
    const username = req.body.username;
    const password = req.body.password; // hash conversion of password
    // *** during find, documents are authenticated and then decrypted by Mongoose ***
    // find a match between the fields entered and the ones already stores in the database
    User.findOne({email: username}, function(err, foundUser) { // add a callback to handle any errors
        // if there are any errors
        if (err) {
            console.log(err); // log the error(s)
        }
        // if there are no errors
        else {
            // if a user is found in the database
            if(founderUser) {
                // if the hashed user password matches the hashed password found in the database
                // bcrypt.compare(myPlaintextPassword, hash, function(err, res)){});
                bcrypt.compare(password, foundUser.password, function(err, result) {
                    // if a comparison returns a positive match 
                    if (result === true) {
                      // authentication is successful   
                      res.render("secrets"); // render the secrets page 
                    }
                });
            }  
        }
    });
});
*/

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


// port listening 
app.listen(port, function() {
    console.log("Server started on port 3000");
});