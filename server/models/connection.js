module.exports = function(sequelize, DataTypes) {
  var Connection = sequelize.define('Connection', {
    type: {
      type: DataTypes.ENUM('parent_child', 'marriage', 'step_parent_child')
    },
    start_date: {
      type: DataTypes.DATE
    },
    end_date: {
      type: DataTypes.DATE
    }
  });
  return Connection;
};
