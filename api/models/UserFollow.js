'use strict';

module.exports = function(sequelize) {

  var UserFollow = sequelize.define('UserFollow', {},
  {
    indexes: [
      {
        fields: ['UserId'],
        method: 'BTREE'
      }
    ],
    classMethods: {
      associate: function(models) {
        UserFollow.belongsTo(models.User, { as: 'Follower' });
        UserFollow.belongsTo(models.User, { as: 'User' });
      }
    }
  });

  return UserFollow;

};
