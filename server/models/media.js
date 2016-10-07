module.exports = function(sequelize, DataTypes) {
  var Media = sequelize.define('Media', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.ENUM('video', 'audio', 'document')
    },
    date: {
      type: DataTypes.DATE
    },
    description: {
      type: DataTypes.TEXT
    },
    url: {
      type: DataTypes.STRING
    }
  });
  return Media;
};
