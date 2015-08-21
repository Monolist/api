'use strict';

var when            = require('when');
var _               = require('lodash');
var models          = require('../models');
var Sequelize       = require('sequelize');
var ActivityManager = require('../utils/ActivityManager');

/* ====================================================== */

exports.get = function(req, res) {

  var fetchGroup = function(identifier) {
    var deferred = when.defer();
    var query;

    if ( isFinite(identifier) ) {
      query = { id: identifier };
    } else {
      query = { slug: identifier };
    }

    models.Group.find({
      where: query,
      include: [
        {
          model: models.User,
          as: 'Owner'
        },
        {
          model: models.GroupMembership,
          as: 'Memberships',
          include: [models.User]
        }
      ]
    }).then(function(group) {
      if ( _.isEmpty(group) ) {
        deferred.reject({ status: 404, body: 'Group could not be found at identifier: ' + identifier });
      } else {
        group = group.toJSON();
        delete group.OwnerId;
        group.members = _.pluck(group.Memberships, 'User');
        delete group.Memberships;
        deferred.resolve(group);
      }
    }).catch(function(err) {
      deferred.reject({ status: 500, body: err });
    });

    return deferred.promise;
  };

  fetchGroup(req.params.identifier).then(function(group) {
    res.status(200).json(group);
  }).catch(function(err) {
    res.status(err.status).json({ status: err.status, message: err.body.toString() });
  });

};

/* ====================================================== */

exports.create = function(req, res) {

  var checkTitle = function(group, currentUser) {
    var deferred = when.defer();
    var title = group.title || group.Title;

    models.Group.find({
      where: { title: title }
    }).then(function(retrievedGroup) {
      if ( !_.isEmpty(retrievedGroup) ) {
        deferred.reject({ status: 400, body: 'That name is already taken.' });
      } else {
        deferred.resolve([group, currentUser]);
      }
    });

    return deferred.promise;
  };

  var createGroup = function(data) {
    var deferred = when.defer();
    var group = data[0];
    var currentUser = data[1];

    group = {
      OwnerId: currentUser.id,
      title: group.title || group.Title,
      description: group.description || group.Description,
      privacy: group.privacy || group.Privacy,
      inviteLevel: group.inviteLevel || group.InviteLevel,
    };

    models.Group.create(group).then(function(savedGroup) {
      savedGroup = savedGroup.toJSON();
      savedGroup.owner = currentUser;
      deferred.resolve([savedGroup, currentUser]);
    }).catch(function(err) {
      console.log('error creating group:', err);
      deferred.reject({ status: 500, body: err });
    });

    return deferred.promise;
  };

  var createMembership = function(data) {
    var deferred = when.defer();
    var group = data[0];
    var currentUser = data[1];
    var membership = {
      GroupId: group.id,
      UserId: currentUser.id,
      level: 3 // Owner level
    };

    models.GroupMembership.create(membership).then(function() {
      deferred.resolve(group);
    }).catch(function(err) {
      // Still resolve since group was already created
      deferred.resolve(group);
    });

    return deferred.promise;
  };

  checkTitle(req.body, req.user)
  .then(createGroup)
  .then(createMembership)
  .then(function(resp) {
    res.status(200).json(resp);
  }).catch(function(err) {
    console.log('finally caught error:', err);
    res.status(err.status).json({ status: err.status, message: err.body.toString() });
  });

};

/* ====================================================== */

exports.getPlaylists = function(req, res) {

  var fetchPlaylists = function(groupId, limit, offset) {
    var deferred = when.defer();

    limit = ( limit && limit < 50 ) ? limit : 20;
    offset = offset || 0;

    models.Playlist.findAll({
      where: {
        ownerId: groupId,
        ownerType: 'group'
      },
      limit: limit,
      offset: offset
    }).then(function(retrievedPlaylists) {
      deferred.resolve(retrievedPlaylists);
    }).catch(function(err) {
      deferred.reject({ status: 500, body: err });
    });

    return deferred.promise;
  };

  fetchPlaylists(req.params.id, req.query.limit, req.query.offset).then(function(playlists) {
    res.status(200).json(playlists);
  }).catch(function(err) {
    res.status(err.status).json({ status: err.status, message: err.body.toString() });
  });

};

/* ====================================================== */

exports.getTrending = function(req, res) {

  var fetchGroups = function() {
    var deferred = when.defer();

    // TODO: real logic here to determine trending
    models.Group.findAll().then(function(groups) {
      deferred.resolve(groups);
    }).catch(function(err) {
      deferred.reject({ status: 500, body: err });
    });

    return deferred.promise;
  };

  fetchGroups().then(function(groups) {
    res.status(200).json(groups);
  }).catch(function(err) {
    res.status(err.status).json({ status: err.status, message: err.body.toString() });
  });

};

/* ====================================================== */

exports.update = function(req, res) {

  var fetchGroup = function(id, updates) {
    var deferred = when.defer();

    models.Group.find({
      where: { id: id }
    }).then(function(group) {
      if ( !_.isEmpty(group) ) {
        deferred.resolve([group, updates]);
      } else {
        deferred.reject({ status: 404, body: 'Group could not be found at the ID: ' + id });
      }
    });

    return deferred.promise;
  };

  var updateGroup = function(data) {
    var deferred = when.defer();
    var retrievedGroup = data[0];
    var updates = data[1];
    var sanitizedUpdates = {};

    if ( updates.title || updates.Title ) {
      sanitizedUpdates.title = updates.title || updates.Title;
    }

    if ( updates.description || updates.Description ) {
      sanitizedUpdates.description = updates.description || updates.Description;
    }

    retrievedGroup.updateAttributes(sanitizedUpdates).then(function(updatedUser) {
      deferred.resolve(updatedUser);
    }).catch(function(err) {
      deferred.reject({ status: 500, body: err });
    });

    return deferred.promise;
  };

  fetchGroup(req.params.id, req.body)
  .then(updateGroup)
  .then(function(updatedGroup) {
    res.status(200).json(updatedGroup);
  }).catch(function(err) {
    res.status(err.status).json({ status: err.status, message: err.body.toString() });
  });

};

/* ====================================================== */

exports.search = function(req, res) {

  var searchGroups = function(query) {
    var deferred = when.defer();

    models.Group.findAll({
      where: Sequelize.or(
        { title: { ilike: '%' + query + '%' } },
        Sequelize.or(
          { slug: { ilike: '%' + query + '%' } },
          { description: { ilike: '%' + query + '%' } }
        )
      ),
      include: [
        {
          model: models.User,
          as: 'Owner'
        },
        {
          model: models.GroupMembership,
          as: 'Memberships',
          include: [
            {
              model: models.User,
              attributes: ['id']
            }
          ]
        }
      ]
    }).then(function(retrievedGroups) {
      retrievedGroups = _.map(retrievedGroups, function(group) {
        group = group.toJSON();
        delete group.OwnerId;
        group.members = _.pluck(group.Memberships, 'User');
        delete group.Memberships;
        return group;
      });
      deferred.resolve(retrievedGroups);
    }).catch(function(err) {
      deferred.reject({ status: 500, body: err });
    });

    return deferred.promise;
  };

  searchGroups(req.params.query).then(function(groups) {
    res.status(200).json(groups);
  }).catch(function(err) {
    console.log('error searching groups:', err);
    res.status(err.status).json({ status: err.status, message: err.body.toString() });
  });

};

/* ====================================================== */

exports.getPosts = function(req, res) {



};

/* ====================================================== */

exports.follow = function(req, res) {

  var followGroup = function(currentUserId, groupId) {
    var deferred = when.defer();
    var attributes = {
      FollowerId: currentUserId,
      GroupId: groupId
    };

    models.GroupFollow.find({
      where: attributes
    }).then(function(retrievedFollowing) {
      if ( _.isEmpty(retrievedFollowing) ) {
        models.GroupFollow.create(attributes).then(function(savedFollow) {
          deferred.resolve(savedFollow);
        }).catch(function(err) {
          deferred.reject({ status: 500, body: err });
        });
      } else {
        retrievedFollowing.destroy().then(function() {
          deferred.resolve('Following successfully removed.');
        }).catch(function(err) {
          deferred.reject({ status: 500, body: err });
        });
      }
    });

    return deferred.promise;
  };

  followGroup(req.user.id, req.params.id).then(function(resp) {
    res.status(200).json({ status: 200, data: resp });
  }).catch(function(err) {
    res.status(err.status).json({ status: err.status, error: err.body.toString() });
  });

};

/* ====================================================== */

exports.addMember = function(req, res) {

  var getCurrentUserLevel = function(groupId, actorId, memberId) {
    var deferred = when.defer();

    models.GroupMembership.find({
      where: {
        GroupId: groupId,
        UserId: req.user.id
      }
    }).then(function(retrievedMembership) {
      if ( !_.isEmpty(retrievedMembership) ) {
        deferred.resolve([groupId, actorId, memberId, retrievedMembership.level]);
      } else {
        deferred.reject({ status: 401, body: 'Current user is not a member of that group.' });
      }
    });

    return deferred.promise;
  };

  var fetchGroup = function(data) {
    var deferred = when.defer();
    var groupId = data[0];
    var actorId = data[1];
    var memberId = data[2];
    var currentUserLevel = data[3];

    models.Group.find({
      where: { id: groupId }
    }).then(function(group) {
      if ( _.isEmpty(group) ) {
        deferred.reject({ status: 404, body: 'Group could not be found at ID: ' + groupId });
      } else if ( group.inviteLevel > currentUserLevel ) {
        deferred.reject({ status: 401, body: 'User does not have permission to add members to that group.' });
      } else {
        deferred.resolve([groupId, actorId, memberId]);
      }
    }).catch(function(err) {
      deferred.reject({ status: 500, body: err });
    });

    return deferred.promise;
  };

  var createMembership = function(data) {
    var deferred = when.defer();
    var groupId = data[0];
    var actorId = data[1];
    var memberId = data[2];
    var membership = {
      GroupId: groupId,
      UserId: memberId
    };

    models.GroupMembership.findOrCreate({
      where: membership,
      defaults: membership
    }).then(function(createdMembership) {
      if ( createdMembership.constructor === Array ) {
        createdMembership = createdMembership[0];
      }
      deferred.resolve(createdMembership);
    }).catch(function(err) {
      console.log('error creating membership:', err);
      deferred.reject({ status: 500, body: err });
    });

    return deferred.promise;
  };

  var deleteFollow = function(membership) {
    var deferred = when.defer();

    models.GroupFollow.find({
      where: {
        FollowerId: membership.UserId,
        GroupId: membership.GroupId
      }
    }).then(function(follow) {
      if ( !_.isEmpty(follow) ) {
        follow.destroy().then(function() {
          deferred.resolve(membership);
        });
      } else {
        deferred.resolve(membership);
      }
    }).catch(function() {
      // Still resolve since member was added
      deferred.resolve(membership);
    });

    return deferred.promise;
  };

  getCurrentUserLevel(req.params.groupId, req.user.id, req.params.memberId)
  .then(fetchGroup)
  .then(createMembership)
  .then(deleteFollow)
  .then(ActivityManager.queue.bind(null, 'group', req.params.groupId, 'addMember', req.user.id, req.params.memberId))
  .then(function(createdMembership) {
    res.status(200).json(createdMembership);
  }).catch(function(err) {
    res.status(err.status).json({ status: err.status, message: err.body.toString() });
  });

};

/* ====================================================== */

exports.removeMember = function(req, res) {

  // TODO: better checking to let admins remove members

  var fetchGroup = function(groupId, actorId, memberId) {
    var deferred = when.defer();

    actorId = parseInt(actorId);
    memberId = parseInt(memberId);

    models.Group.find({
      where: { id: groupId }
    }).then(function(group) {
      if ( _.isEmpty(group) ) {
        deferred.reject({ status: 404, body: 'Group could not be found at ID: ' + groupId });
      } else if ( parseInt(group.OwnerId) !== actorId && actorId !== memberId ) {
        deferred.reject({ status: 401, body: 'User does not have permission to remove that member from the group.' });
      } else {
        deferred.resolve([groupId, actorId, memberId]);
      }
    }).catch(function(err) {
      deferred.reject({ status: 500, body: err });
    });

    return deferred.promise;
  };

  var destroyMembership = function(data) {
    var deferred = when.defer();
    var groupId = data[0];
    var actorId = data[1];
    var memberId = data[2];

    models.GroupMembership.destroy({
      where: {
        GroupId: groupId,
        UserId: memberId
      }
    }).then(function() {
      deferred.resolve();
    }).catch(function(err) {
      deferred.reject({ status: 500, body: err });
    });

    return deferred.promise;
  };

  fetchGroup(req.params.groupId, req.user.id, req.params.memberId)
  .then(destroyMembership)
  .then(ActivityManager.queue.bind(null, 'group', req.params.groupId, 'removeMember', req.user.id, req.params.memberId))
  .then(function() {
    res.status(200).json({ status: 200, message: 'Member successfully removed from group.' });
  }).catch(function(err) {
    res.status(err.status).json({ status: err.status, message: err.body.toString() });
  });

};

/* ====================================================== */

exports.updateMemberLevel = function(req, res) {

  var getCurrentUserLevel = function(groupId, memberId, newLevel) {
    var deferred = when.defer();

    models.GroupMembership.find({
      where: {
        GroupId: groupId,
        UserId: req.user.id
      }
    }).then(function(retrievedMembership) {
      if ( !_.isEmpty(retrievedMembership) ) {
        deferred.resolve([groupId, memberId, newLevel, retrievedMembership.level]);
      } else {
        deferred.reject({ status: 401, body: 'Current user is not a member of that group.' });
      }
    });

    return deferred.promise;
  };

  var fetchMembership = function(data) {
    var deferred = when.defer();
    var groupId = data[0];
    var memberId = data[1];
    var newLevel = data[2];
    var currentUserLevel = data[3];

    if ( newLevel > currentUserLevel ) {
      deferred.reject({ status: 403, body: 'User cannot upgrade members above themselves.' });
    } else {
      models.GroupMembership.find({
        where: {
          GroupId: groupId,
          UserId: memberId
        }
      }).then(function(retrievedMembership) {
        if ( !_.isEmpty(retrievedMembership) ) {
          deferred.resolve([retrievedMembership, newLevel, currentUserLevel]);
        } else {
          deferred.reject({ status: 404, body: 'Membership could not be found at the IDs: ' + groupId + ', ' + memberId });
        }
      });
    }

    return deferred.promise;
  };

  var updateMembership = function(data) {
    var deferred = when.defer();
    var membership = data[0];
    var newLevel = data[1];
    var currentUserLevel = data[2];
    var updates = { level: newLevel };

    if ( newLevel < membership.level && currentUserLevel <= membership.level ) {
      deferred.reject({ status: 403, body: 'Users cannot demote members above themselves.' });
    } else {
      membership.updateAttributes(updates).then(function(updatedMembership) {
        deferred.resolve(updatedMembership);
      }).catch(function(err) {
        deferred.reject({ status: 500, body: err });
      });
    }

    return deferred.promise;
  };

  getCurrentUserLevel(req.params.groupId, req.params.memberId, req.params.newLevel)
  .then(fetchMembership)
  .then(updateMembership)
  .then(ActivityManager.queue.bind(null, 'group', req.params.groupId, 'updateMemberLevel', req.user.id))
  .then(function(updatedMembership) {
    res.status(200).json(updatedMembership);
  }).catch(function(err) {
    res.status(err.status).json({ status: err.status, message: err.body.toString() });
  });

};

/* ====================================================== */

exports.delete = function(req, res) {

  var findAndEnsureUserCanDelete = function(currentUser, groupId) {
    var deferred = when.defer();

    models.Group.find({
      where: { id: groupId }
    }).then(function(group) {
      if ( currentUser.role !== 'admin' || group.OwnerId === currentUser.id ) {
        deferred.resolve(group);
      } else {
        deferred.reject({ status: 401, body: 'You do not have permission to delete that group.'});
      }
    }).catch(function(err) {
      deferred.reject({ status: 500, body: err });
    });

    return deferred.promise;
  };

  var deleteGroup = function(group) {
    var deferred = when.defer();

    group.destroy().then(function() {
      deferred.resolve();
    }).catch(function(err) {
      deferred.reject({ status: 500, body: err });
    });

    return deferred.promise;
  };

  findAndEnsureUserCanDelete(req.user, req.params.id)
  .then(deleteGroup)
  .then(function() {
    res.status(200).json({ status: 200, message: 'Group successfully deleted.' });
  }).catch(function(err) {
    res.status(err.status).json({ status: err.status, message: err.body.toString() });
  });

};