const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
var mongoUtil = require( '../mongoUtil.js' )

const { forwardAuthenticated } = require('../config/auth');

// Login Page
router.get('/login', forwardAuthenticated, (req, res) => res.render('login'));

// Register Page
router.get('/register', forwardAuthenticated, (req, res) => res.render('register'));

// Register
router.post('/register', async(req, res) => {
  const db=req.db;
  const { name, email, password, password2, adminpassword } = req.body;
  let errors = [];

  if (!name || !email || !password || !password2) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (password != password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }
  if(adminpassword != "Admin@123"){
    errors.push({ msg: 'Admin Password is Incorrect' });
  }

  if (errors.length > 0) {
    res.render('register', {
      errors,
      name,
      email,
      password,
      password2,
      adminpassword
    });
  }
     else {
      db.collection("OauthUsers").findOne({email: email}).then(user => {
        if (user) {
          errors.push({ msg: 'Email already exists' });
          res.render('register', {
            errors,
            name,
            email,
            password,
            password2
          });
        } else 
        {
          const newUser = {name:name,email:email,password:password, date:Date()}
          
  
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
              if (err) throw err;
              newUser.password = hash;
              db.collection("OauthUsers").insertOne(newUser, function(err, res){
                if (err) throw err;
                console.log("new user added")
                req.flash(
                  'success_msg', 'You are now registered and can log in');
              });
              res.redirect('/users/login');
              });
                
              });
            }
          });
        }
      });

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/api',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/users/login');
});

module.exports = router;
