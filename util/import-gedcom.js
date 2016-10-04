/**
 * Convert .ged files to json format
 */

var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var through = require('through2');
var _ = require('lodash');

/** gedcom-stream */
var Gedcom = require('gedcom-stream');
var gedcom = new Gedcom();
var data = [];
var db = require('../server/models');

function hasUniqueNames(children) {
  var setOfKeys = {};
  for (var i = children.length - 1; i >= 0; i--) {
    var name = children[i].name;
    if (setOfKeys[name]) {
      return false;
    }
    setOfKeys[name] = true;
  }
  return true;
}

function transformItem(item) {
  var children = item.children;
  if (children && _.isArray(children)) {
    if (children.length === 0 && item.value) {
      return item.value;
    }
    // children = children.map(transformItem);
    var fn = hasUniqueNames(children) ? 'keyBy' : 'groupBy';
    var childrenMap = _[fn](children, 'name');
    _.forEach(childrenMap, function(child, key) {
      if (_.isArray(child)) {
        child = child.map(transformItem);
      } else if (_.isObject(child)) {
        child = transformItem(child);
      }
      childrenMap[key] = child;
    });
    if (!item.value) {
      return childrenMap;
    }
    item.children = childrenMap;
    return item;
  }
  return item;
}

gedcom.on('data', data.push.bind(data));
gedcom.on('end', function() {

  var counts = { NOTE: 0, FAM: 0, INDI: 0 };
  var individuals = {};
  var families = {};
  var notes = {};
  data.forEach(function(d) {
    counts[d.name]++;
    switch(d.name) {
      case 'INDI':
        individuals[d.id] = transformItem(d);
        console.log(individuals[d.id].NOTE);
        break;
      case 'FAM':
        families[d.id] = transformItem(d)
        break;
      case 'NOTE':
        notes[d.id] = transformItem(d);
        break;
      case 'HEAD':
        // console.log('HEAD: ', d);
        break;
      case 'TRLR':
        // console.log('TRLR: ', d);
        break;
    }
  });
  // Insert Person records

  // maps GEDCOM uuid to db instance
  var gedIdLookup = {};
  var promises = [];
  /*
  _.forEach(individuals, (person_data, id) => {

    // Birth date
    var birth_date;
    if (person_data.BIRT && person_data.BIRT.DATE) {
      try {
        birth_date = new Date(person_data.BIRT.DATE.toLowerCase());
        if (isNaN(birth_date)) {
          throw new Error('Birth date was not parsable: ', person_data.BIRT.DATE)
        }
      } catch (e) {
        console.log('=====BIRTH DATE ERROR=====');
        console.log(e);
      }
    }

    // names
    var nameRE = /^([^\s]+\s)?([^\/]*)?\s?(?:\/([^\/]+)\/)?$/ig;
    var matches = nameRE.exec(person_data.NAME);
    var first = matches[1];
    var middle = matches[2];
    var last = matches[3];
    var person = {};

    // name
    person.Names = [{
      start_date: birth_date,
      change_reason: 'given',
      first: first || middle,
      middles: middle,
      last: last || middle || first || 'UNKNOWN'
    }];

    // dob
    person.birth_date = birth_date;
    if (person_data.BIRT && person_data.BIRT.PLAC) {
      person.birth_place = person_data.BIRT.PLAC;
    }

    // basic info
    person.gender = person_data.SEX;
    person.education = person_data.EDUC;
    person.religion = person_data.RELI;
    person.occupation = person_data.OCCU;

    // notes
    person_data.NOTE

    var promise = db.Person.create(person);

    promises.push(promise);
    
  });
  */

  _.forEach(notes, (note_data, id) => {
    var content = [].concat(note_data.CONT).join('\n') + (note_data.CONC ? [].concat(note_data.CONC).join('') : '');
    console.log('NOTE CONTENT', content);
    // db.Note.create({
    //   content: content
    // });
  });

  _.forEach(families, (family, id) => {
    // if (family.HUSB && family.WIFE) {
    //   db.Connection.create({

    //   })
    // }
    // console.log('family: ', id, family);
  })

  // Promise.all(promises).then(function() {
  //   // Use families to create Connections
  //   _.forEach(families, (family, id) => {
  //     console.log(family);
  //   });
  //   console.log('all done...');
  // });
  
});
gedcom.on('error', function(err) {
  console.log('Error:');
  console.log(err);
  console.log(data);
});
fs.createReadStream(argv.in, { encoding: 'utf8' })
.pipe(through(function(chunk, enc, callback) {
  // debugger;
  this.push(chunk);
  callback();
}))
.pipe(gedcom);


/** parse-gedcom: parse
var parser = require('parse-gedcom');
fs.readFile(argv.in, 'utf8', function(err, result) {
  if (err) throw err;
  var parsed = parser.parse(result);
  fs.writeFile(argv.out, JSON.stringify(parsed, 0, 2), 'utf8', function(err) {
    if (err) throw err;
    console.log('File converted: ', argv.out);
  });
});
*/

/** parse-gedcom: d3ize
var parser = require('parse-gedcom');
fs.readFile(argv.in, 'utf8', function(err, result) {
  if (err) throw err;
  var parsed = parser.d3ize(parser.parse(result));
  fs.writeFile(argv.out, JSON.stringify(parsed, 0, 2), 'utf8', function(err) {
    if (err) throw err;
    console.log('File converted: ', argv.out);
  });
});
*/


