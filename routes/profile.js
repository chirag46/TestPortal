//Passport local
// currently this file is not used anywhere
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const keys = require('./keys');
//const User = require('../models/User');
var mongoUtil = require( '../mongoUtil.js' )

db.collection("OauthUsers").findOne({
  email: email
}).then(user => {
  console.log(user.email);
  console.log(user.name);
});

function getProfile(){
    console.log("hi");
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
          // Match user
          var db = mongoUtil.getDb();
          db.collection("OauthUsers").findOne({
            email: email
          }).then(user => {
            console.log(user.email);
            console.log(user.name);
          });
          //
          fetch(`/api/profile/${user.email}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          })
          .then(response => response.json())
          .then(data => {
            console.log('Success:', data);          
          })
          .catch((error) => {
            console.error('Error:', error);
          }); 
        })
      );
    }
  