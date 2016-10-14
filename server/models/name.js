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
    prefix: {
      type: DataTypes.STRING
    },
    first: {
      type: DataTypes.STRING
    },
    nickname: {
      type: DataTypes.STRING
    },
    middles: {
      type: DataTypes.STRING
    },
    last: {
      type: DataTypes.STRING
    },
    suffix: {
      type: DataTypes.STRING
    }
  });
  Name.Instance.prototype.toString = function() {
    let str = '';
    if (this.prefix) {
      str += this.prefix + ' ';
    }
    str += (this.first || 'UNKNOWN') + ' ';
    if (this.nickname) {
      str += `"${this.nickname}" `;
    }
    if (this.middles) {
      str += this.middles + ' ';
    }
    str += this.last || 'UNKNOWN';
    if (this.suffix) {
      str += ', ' + this.suffix;
    }
    return str;
  };
  return Name;
};
