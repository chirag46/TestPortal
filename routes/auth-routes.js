const router = require('express').Router();
const passport = require('passport');

// auth with google+
router.get('/google', passport.authenticate('google', {
    scope: [ 'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email']
    
}));

// callback route for google to redirect to
// hand control to passport to use code to grab profile info
router.get('/google/redirect', passport.authenticate('google'), (req, res) => {
    // res.send(req.user);
    res.redirect('/api');
});

module.exports = router;
