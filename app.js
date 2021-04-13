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
const encrypt = require("mongoose-encryption"); // mongoose-encryption
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

// create a secret string (encryption key)
////const secret = "Thisisalongsecretstring."; // unsafe way of storing an encryption key
// const secret has instead been added to hidden .env file (environment specific variable) 

// add encrypt package as a plugin to the Schema (must be created prior to Model creation)
//userSchema.plugin(encrypt, {secret: secret, encryptedFields: ["password"] }); // no longer needed since we use .env
userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"] }); // enable encryption for the password field only


// create users (which will be added to userDB) via the mongoose Model based on userSchema
const User = mongoose.model("User", userSchema); // "User" becomes "users" behind the scenes


// GET request for the home route
app.get("/", function(req, res){
    res.render("home");
});

// GET request for the login route
app.get("/login", function(req, res){
    res.render("login");
});

// GET request for the register route
app.get("/register", function(req, res){
    res.render("register");
});

// POST request for the register route (triggers when user clicks submit in the form)
app.post("/register", function(req, res){
    // create a mongoose Document for each new user based on the Model 
    const newUser = new User({ // create a new user 
        email: req.body.username,
        password: req.body.password
    });
    // *** during save, documents are encrypted and then signed by Mongoose ***
    // save the document to database (save new user) 
    newUser.save(function(err) { // add callback function to handle any errors
        // if save is complete without errors
        if (!err) {
        // users can only access secrets page via a successful login/registration
        res.redirect("secrets"); // redirect to secrets page
        }
    });
});


// POST request for the login route
app.post("/login", function(req, res) {
    // grab and store (body-parse) username/password fields from the form
    const username = req.body.username;
    const password = req.body.password;
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
                // if the user password matches the password found in the database
                if(foundUser.password === password) {
                    // authentication is successful 
                    res.render("secrets"); //  render the secrets page 
                }
            }  
        }
    });
});

// 

// port listening 
app.listen(port, function() {
    console.log("Server started on port 3000");
  });
  
