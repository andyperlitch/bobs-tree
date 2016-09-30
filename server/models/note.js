module.exports = function(sequelize, DataTypes) {
  var Note = sequelize.define('Note', {
    content: {
      type: DataTypes.TEXT
    }
  });
  return Note;
};
