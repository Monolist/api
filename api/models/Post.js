'use strict';

module.exports = function(sequelize, DataTypes) {

  var Post = sequelize.define('Post', {
    body:  { type: DataTypes.STRING, allowNull: false },
    track: { type: DataTypes.JSON, allowNull: true }
  },
  {
    classMethods: {
      associate: function(models) {
        Post.belongsTo(models.User);
        Post.belongsTo(models.Group);
        Post.hasMany(models.PostDownvote, { as: 'Downvotes', onDelete: 'cascade' });
        Post.hasMany(models.PostUpvote, { as: 'Upvotes', onDelete: 'cascade' });
        Post.hasMany(models.PostComment, { as: 'Comments', onDelete: 'cascade' });
      }
    }
  });

  return Post;

};