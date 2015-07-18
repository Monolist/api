'use strict';

var passport              = require('passport');
var _                     = require('lodash');
var LocalStrategy         = require('passport-local').Strategy;
var FacebookTokenStrategy = require('passport-facebook-token').Strategy;
var models                = require('./models');

/* ====================================================== */

module.exports = function() {

  passport.use(new LocalStrategy(function(username, password, done) {
    models.User.find({
      where: { username: username },
      include: [models.StarredTrack]
    }).then(function(retrievedUser) {
      if ( !_.isEmpty(retrievedUser) ) {
        retrievedUser.verifyPassword(password, function(err, result) {
          if ( err || !result ) {
            return done(null, false, { message: 'Incorrect password.' });
          } else {
            return done(null, retrievedUser);
          }
        });
      } else {
        return done(null, false, { message: 'No user could be found with that username.' });
      }
    }).catch(function(err) {
      return done(err);
    });
  }));

  /* ====================================================== */

  passport.use(new FacebookTokenStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET
  }, function(accessToken, refreshToken, profile, done) {
    models.User.find({
      where: { facebookId: profile.id },
      include: [models.StarredTrack]
    }).then(function(retrievedUser) {
      if ( !_.isEmpty(retrievedUser) ) {
        return done(null, retrievedUser);
      } else {
        return done(null, false, { message: 'No user could be found for that Facebook account.' });
      }
    }).catch(function(err) {
      return done(err);
    });
  }));

  /* ====================================================== */

  passport.serializeUser(function(user, done) {
    done(null, user.username);
  });

  /* ====================================================== */

  passport.deserializeUser(function(username, done) {
    models.User.find({
      where: { username: username },
      include: [models.StarredTrack]
    }).then(function(user) {
      done(null, user);
    }).catch(function(err) {
      done(err);
    });
  });

};