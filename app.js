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
const ejs = require("ejs"); // ejs
const mongoose = require("mongoose"); // mongoose
//const encrypt = require("mongoose-encryption"); // mongoose encryption
//const md5 = require("md5"); // hash function (a weak hashing algorithm)
const bcrypt = require("bcrypt"); // bcrypt hash function 
const saltRounds = 10; // salt rounds
const express = require("express"); // express

// create a new application that uses express
const app = express();

// set view engine to use EJS templating 
app.set("view engine", "ejs"); // a path to views folder containing ejs files

// parse the URL-encoded body of requests
app.use(express.urlencoded({extended: true})); 
// use public folder to store static files (such as images and css code) 
app.use(express.static("public")); 


// allow mongoose to connect to a local mongoDB instance (userDB)
mongoose.connect("mongodb://localhost:27017/userDB",  
                    {useNewUrlParser: true, useUnifiedTopology: true}); 


// create a new object from the mongoose Schema class that holds the email and password fields
const userSchema = new mongoose.Schema ({
    email: String,
    password: String
}); 


// refer to environment specific variable (SECRET) inside .env file for they encryption key

// add encrypt package as a plugin to the Schema (must be created prior to Model creation)
// use process.env.* to access the KEY inside the .env file and use encryptedFields to encrypt only the password field
//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"] }); 


// create users (which will be added to userDB) via the mongoose Model based on userSchema
const User = mongoose.model("User", userSchema); // "User" becomes "users" behind the scenes


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

// 

// port listening 
app.listen(port, function() {
    console.log("Server started on port 3000");
  });
  
