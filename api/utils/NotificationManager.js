'use strict';

var _      = require('lodash');
var when   = require('when');
var models = require('../models');
var Queue  = require('./Queue');

/* ====================================================== */

exports.getGroupUserIds = function(groupId) {

  var deferred = when.defer();

  models.Group.find({
    where: { id: groupId },
    include: [
      {
        model: models.GroupMembership,
        as: 'Memberships'
      },
      {
        model: models.GroupFollow,
        as: 'Followers'
      }
    ]
  }).then(function(group) {
    var ids = [];

    if ( !_.isEmpty(group) ) {
      var memberIds = _.pluck(group.Memberships, 'UserId');
      var followerIds = _.pluck(group.Followers, 'FollowerId');
      ids = _([group.OwnerId]).concat(ids, memberIds, followerIds).uniq().value();
    }

    deferred.resolve(ids);
  }).catch(function(err) {
    deferred.reject(err);
  });

  return deferred.promise;

};

/* ====================================================== */

exports.getPlaylistUserIds = function(playlistId, action, actorId) {

  var mainDeferred = when.defer();

  // TODO: also get members of group if playlist owner is group

  var getPlaylistUsers = function() {
    var deferred = when.defer();

    models.Playlist.find({
      where: { id: playlistId },
      include: [
        {
          model: models.Collaboration,
          attributes: ['UserId']
        },
        {
          model: models.PlaylistFollow,
          as: 'Followers',
          attributes: ['UserId']
        }
      ]
    }).then(function(playlist) {
      var ids = [];

      if ( !_.isEmpty(playlist) ) {
        var collaboratorIds = _.pluck(playlist.Collaborations, 'UserId');
        var followerIds = _.pluck(playlist.Followers, 'UserId');
        ids = _(ids).concat(collaboratorIds, followerIds).uniq().value();

        if ( playlist.ownerType === 'user' && !_.contains(ids, playlist.ownerId) ) {
          ids.push(playlist.ownerId);
          deferred.resolve(ids);
        } else if ( playlist.ownerType === 'group' ) {
          deferred.resolve(getGroupUsers(playlist.ownerId, ids));
        } else {
          deferred.resolve(ids);
        }
      }
    }).catch(function(err) {
      deferred.reject(err);
    });

    return deferred.promise;
  };

  var getGroupUsers = function(groupId, ids) {
    var deferred = when.defer();

    models.Group.find({
      where: { id: groupId },
      include: [
        {
          model: models.GroupMembership,
          as: 'Memberships'
        }
      ]
    }).then(function(group) {
      var userIds = _.pluck(group.Memberships, 'UserId');
      deferred.resolve(_(ids).concat(userIds).value());
    }).catch(function() {
      // Still resolve since we got playlist user IDs
      deferred.resolve(ids);
    });

    return deferred.promise;
  };

  var getFollowingUsers = function(ids) {
    var deferred = when.defer();

    if ( action === 'create' ) {
      models.UserFollow.findAll({
        where: { UserId: actorId }
      }).then(function(follows) {
        var userIds = _.pluck(follows, 'FollowerId');
        deferred.resolve(_(ids).concat(userIds).value());
      })
    } else {
      deferred.resolve(ids);
    }

    return deferred.promise;
  }

  getPlaylistUsers()
  .then(getFollowingUsers)
  .then(mainDeferred.resolve);

  return mainDeferred.promise;

};

/* ====================================================== */

exports.getTrackUserIds = function(trackId) {

  var deferred = when.defer();

  models.Track.find({
    where: { id: trackId }
  }).then(function(track) {
    deferred.resolve([track.UserId]);
  }).catch(function(err) {
    deferred.reject(err);
  });

  return deferred.promise;

}

/* ====================================================== */

exports.getUserIdsForEntity = function(entityType, entityId, action, actorId) {

  if ( entityType === 'group' ) {
    return exports.getGroupUserIds(entityId, action, actorId);
  } else if ( entityType === 'playlist' ) {
    return exports.getPlaylistUserIds(entityId, action, actorId);
  } else if ( entityType === 'track' ) {
    return exports.getTrackUserIds(entityId, action, actorId);
  } else if ( entityType === 'user' ) {
    return when([entityId]);
  }

}

/* ====================================================== */

exports.buildNotifications = function(activity) {
  var deferred = when.defer();

  exports.getUserIdsForEntity(activity.entityType, activity.entityId, activity.action, activity.actorId)
  .then(function(userIds) {
    deferred.resolve(_.map(userIds, function(userId) {
      return {
        ActorId: activity.actorId,
        RecipientId: userId,
        entityType: activity.entityType,
        entityId: activity.entityId,
        action: activity.action
      }
    }));
  });

  return deferred.promise;
};

/* ====================================================== */

exports.queue = function(notifications) {
  var deferred = when.defer();

  notifications = _.isArray(notifications) ? notifications : [notifications];

  Queue.notifications(notifications)
  .then(deferred.resolve)
  .catch(deferred.reject);

  return deferred.promise;
};

/* ====================================================== */

exports.create = function(notification) {

  var deferred = when.defer();

  models.Notification.create(notification)
  .then(deferred.resolve)
  .catch(deferred.reject);

  return deferred.promise;

};