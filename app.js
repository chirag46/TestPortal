const express = require('express');
const app = express()
const { MongoClient } = require('mongodb')
const cors=require("cors");
const expressLayouts = require('express-ejs-layouts');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const ejs = require('ejs');
const path = require('path');
app.use(express.static(__dirname + '/public'));
// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));
require('./config/passport');



var mongoUtil = require( './mongoUtil.js' );


mongoUtil.connectToServer();
var db = mongoUtil.getDb();

if(db.collection("OauthUsers").count==0){
  db.collection("OauthUsers").insertOne( { name: " ", email: " ", password: " ", date: date() } )
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}))

// middleware to pass the db object ---> in the req body;
app.use(function (req, res, next) {
  req.db = db;
  next();
});

// Express body parser
app.use(express.urlencoded({ extended: true }));

// Express session
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// Routes
app.use('/', require('./routes/index.js'));
app.use('/users', require('./routes/users.js'));
app.use('/auth', require('./routes/auth-routes.js'));
app.use("/api", require("./api"))  // existing apis ---->
app.use("/apitest", require("./apitest")) // for testing 




module.exports=app;
