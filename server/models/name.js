module.exports = function(sequelize, DataTypes) {
  var Name = sequelize.define('Name', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    start_date: {
      type: DataTypes.DATE
    },
    change_reason: {
      type: DataTypes.ENUM('given', 'marriage', 'divorce', 'other'),
      defaultValue: 'given'
    },
    first: {
      type: DataTypes.STRING
    },
    middles: {
      type: DataTypes.STRING
    },
    last: {
      type: DataTypes.STRING
    }
  });
  return Name;
};
