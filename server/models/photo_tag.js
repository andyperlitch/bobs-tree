module.exports = function(sequelize, DataTypes) {
  var PhotoTag = sequelize.define('PhotoTag', {
    // Relative coordinates of person in the picture
    x: {
      type: DataTypes.FLOAT()
    },
    y: {
      type: DataTypes.FLOAT()
    }
  });
  return PhotoTag;
};
