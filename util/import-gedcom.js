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
var gedIdLookup;
var notes;

function getPersonIdByGedId(gedId) {
  if (_.isArray(gedId) ) {
    gedId = gedId[0];
  }
  if (typeof gedId !== 'string') {
    throw new Error('getPersonIdByGedId was called with an unexpected value for id: ', gedId);
  }
  var strippedId = gedId.replace(/@/g, '');
  if (!gedIdLookup.hasOwnProperty(strippedId)) {
    throw new Error('A reference to an unknown person was found in a family! Reference id: ', gedId);

  }
  return gedIdLookup[strippedId].id;
}

function getNoteByNoteId(noteId) {
  if (_.isArray(noteId) ) {
    noteId = noteId[0];
  }
  if (typeof noteId !== 'string') {
    throw new Error('getNoteByNoteId was called with an unexpected value for id: ', noteId);
  }
  var strippedId = noteId.replace(/@/g, '');
  if (!notes.hasOwnProperty(strippedId)) {
    throw new Error('A reference to an unknown note was found on a person! Reference id: ', noteId);

  }
  return notes[strippedId];
}

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

function stringifyField(field) {
  if (!field) {
    return '';
  }
  var values = [].concat(field);
  return values.join('\n');
}

function transformItem(item) {
  var children = item.children;
  if (children && _.isArray(children)) {
    if (children.length === 0 && item.value) {
      return item.value;
    }
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
  notes = {};
  data.forEach(function(d) {
    counts[d.name]++;
    switch(d.name) {
      case 'INDI':
        individuals[d.id] = transformItem(d);
        break;
      case 'FAM':
        families[d.id] = transformItem(d);
        break;
      case 'NOTE':
        var note_data = transformItem(d);
        notes[d.id] = [].concat(note_data.CONT).join('\n') + (note_data.CONC ? [].concat(note_data.CONC).join('') : '');
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
  gedIdLookup = {};
  var promises = [];

  console.log('===============');
  console.log('Creating people');
  console.log('===============');
  _.forEach(individuals, function(person_data, id) {

    // Birth date
    var birth_date;
    if (person_data.BIRT && typeof person_data.BIRT.DATE === 'string' && person_data.BIRT.DATE.trim()) {
      try {
        birth_date = new Date(person_data.BIRT.DATE.toLowerCase());
        if (isNaN(birth_date)) {
          throw new Error('Birth date was not parsable: ', person_data.BIRT.DATE);
        }
      } catch (e) {
        console.log('=====BIRTH DATE ERROR=====');
        console.log(e);
        birth_date = null;
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
    if (_.isArray(person_data.SEX)) {
      person.gender = person_data.SEX[0];
    } else if (['M', 'F'].indexOf(person_data.SEX) > -1) {
      person.gender = person_data.SEX;
    } else {
      console.log('No gender found for: ', person_data);
    }


    person.education = stringifyField(person_data.EDUC);

    person.religion = stringifyField(person_data.RELI);

    person.occupation = stringifyField(person_data.OCCU);

    // notes -> biography
    if (person_data.NOTE) {
      person.biography = getNoteByNoteId(person_data.NOTE);
    }
    var promise = db.Person.create(person, {
      include: [{
        model: db.Name,
        as: 'Names'
      }]
    }).then(function(person) {
      gedIdLookup[id] = person;
    });

    promises.push(promise);
  });

  Promise.all(promises).then(function() {
    console.log('==============================================');
    console.log('All people have been created. Parsing Families');
    console.log('==============================================');
    // Use families to create Connections
    var cxnPromises = [];
    _.forEach(families, function(family, id) {
      try {

        // marriage
        if (family.HUSB && family.WIFE) {
          var marriagePromise = db.Connection.create({
            type: 'marriage',
            // person_a_id: gedIdLookup[family.HUSB].id,
            person_a_id: getPersonIdByGedId(family.HUSB),
            // person_b_id: gedIdLookup[family.WIFE].id
            person_b_id: getPersonIdByGedId(family.WIFE)
          });
          cxnPromises.push(marriagePromise);
        }

        // children
        var children = [].concat(family.CHIL).filter(c => c);
        children.forEach(function(childId) {

          if (family.HUSB) {
            var fatherPromise = db.Connection.create({
              type: 'parent_child',
              // person_a_id: gedIdLookup[family.HUSB].id,
              person_a_id: getPersonIdByGedId(family.HUSB),
              // person_b_id: gedIdLookup[childId].id
              person_b_id: getPersonIdByGedId(childId)
            });
            cxnPromises.push(fatherPromise);
          }

          if (family.WIFE) {
            var motherPromise = db.Connection.create({
              type: 'parent_child',
              // person_a_id: gedIdLookup[family.WIFE].id,
              person_a_id: getPersonIdByGedId(family.WIFE),
              // person_b_id: gedIdLookup[childId].id
              person_b_id: getPersonIdByGedId(childId)
            });
            cxnPromises.push(motherPromise);
          }

        });

      } catch (e) {
        console.error(e);
      }
    });
    return Promise.all(cxnPromises);
  }, function(e) {
    console.error('An error occurred adding people!');
    console.error(e);
  }).then(function() {
    console.log('all done...');
  }, function(e) {
    console.error('An error occurred adding connections!');
    console.error(e);
  });

});
gedcom.on('error', function(err) {
  console.log('Error:');
  console.log(err);
  console.log(data);
});
fs.createReadStream(argv.in, { encoding: 'utf8' })
.pipe(through(function(chunk, enc, callback) {
  this.push(chunk);
  callback();
}))
.pipe(gedcom);


