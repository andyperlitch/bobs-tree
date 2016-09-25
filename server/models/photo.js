module.exports = function(sequelize, DataTypes) {
  var Photo = sequelize.define('Photo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.ENUM('image', 'video', 'pdf')
    },
    url: {
      type: DataTypes.STRING
    },
    caption: {
      type: DataTypes.TEXT('medium')
    },
    date: {
      type: DataTypes.DATE
    },
    location: {
      type: DataTypes.STRING
    }
  });
  Photo.associate = function(models) {
    Photo.belongsToMany(models.Person, { through: models.PhotoTag });
  };
  return Photo;
};
