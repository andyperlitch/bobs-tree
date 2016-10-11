/**
 * Convert .ged files to json format
 */
let readlineSync = require('readline-sync');
let argv = require('minimist')(process.argv.slice(2));
let fs = require('fs');
let through = require('through2');
let _ = require('lodash');

/** gedcom-stream */
let Gedcom = require('gedcom-stream');
let gedcom = new Gedcom();
let data = [];
let db = require('../server/models');
let gedIdLookup;
let notes;
let currentPeople;

function findByName(first, middles, last) {
  let exactMatches = currentPeople.filter(p => {
    return _.some(p.Names, n => {
      return matches(n.first, first) && matches(n.middles, middles, true) && matches(n.last, last);
    });
  });
  let nearMatches = currentPeople.filter(p => {
    return _.some(p.Names, n => {
      return matches(n.first, first) && matches(n.last, last);
    });
  });
  return exactMatches.concat(nearMatches);
}

function matches(nameA, nameB, trueOnSubstring) {
  if (!nameA && !nameB) {
    return true;
  }
  if (!nameA || !nameB) {
    return false;
  }
  let [a, b] = [nameA, nameB].map(s => s.toLowerCase().replace(/['\s]/g, '').trim());
  return a === b || (trueOnSubstring ? (a.includes(b) || b.includes(a)) : false);
}

function getPersonIdByGedId(gedId) {
  if (_.isArray(gedId) ) {
    gedId = gedId[0];
  }
  if (typeof gedId !== 'string') {
    throw new Error('getPersonIdByGedId was called with an unexpected value for id: ', gedId);
  }
  let strippedId = gedId.replace(/@/g, '');
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
  let strippedId = noteId.replace(/@/g, '');
  if (!notes.hasOwnProperty(strippedId)) {
    throw new Error('A reference to an unknown note was found on a person! Reference id: ', noteId);

  }
  return notes[strippedId];
}

function hasUniqueNames(children) {
  let setOfKeys = {};
  for (let i = children.length - 1; i >= 0; i--) {
    let name = children[i].name;
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
  let values = [].concat(field);
  return values.join('\n');
}

function transformItem(item) {
  let children = item.children;
  if (children && _.isArray(children)) {
    if (children.length === 0 && item.value) {
      return item.value;
    }
    let fn = hasUniqueNames(children) ? 'keyBy' : 'groupBy';
    let childrenMap = _[fn](children, 'name');
    _.forEach(childrenMap, function(child, key) {
      if (_.isArray(child)) {
        child = child.map(transformItem);
        if (child.length === 1) {
          child = transformItem(child[0]);
        }
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

  let counts = { NOTE: 0, FAM: 0, INDI: 0 };
  let individuals = {};
  let families = {};
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
      case 'NOTE': {
        let note_data = transformItem(d);
        notes[d.id] = [].concat(note_data.CONT).join('\n') + (note_data.CONC ? [].concat(note_data.CONC).join('') : '');
        break;
      }
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
  let newPeople = [];

  console.log('===============');
  console.log('Creating people');
  console.log('===============');
  _.forEach(individuals, function(person_data, id) {

    let person = {};

    // names
    let nameRE = /^([^\s]+\s)?([^\/]*)?\s?(?:\/([^\/]+)\/)?$/ig;
    let nameString;
    if (typeof person_data.NAME === 'string') {
      nameString = person_data.NAME;
    } else if (_.isObject(person_data.NAME)) {
      debugger;
    }
    let matches = nameRE.exec(nameString);
    let first = matches[1];
    let middle = matches[2];
    let last = matches[3];

    // Birth date
    let birth_date;
    if (person_data.BIRT && typeof person_data.BIRT.DATE === 'string' && person_data.BIRT.DATE.trim()) {
      try {
        birth_date = new Date(person_data.BIRT.DATE.toLowerCase());
        if (isNaN(birth_date)) {
          throw new Error('Birth date was not parsable: ', person_data.BIRT.DATE);
        }
      } catch (e) {
        console.warn(`WARNING: A birth date was not parseable for ${first} ${middle || ''} ${last}`);
        birth_date = null;
      }
    }

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


    // Check for duplicate
    let name = person.Names[0];
    let existingMatches = findByName(name.first, name.middles, name.last);
    if (existingMatches.length > 1) {
      let maybeSamePeople = existingMatches.map(p => {
        let names = p.Names.map(n => `${n.first} ${n.middles} ${n.last}`).join(' a.k.a. ');
        return `${names}, born: ${new Date(p.birth_date).toDateString()}`;
      });
      let noneOption = 'Create new person';
      let noneOptionIndex = 0;
      maybeSamePeople.unshift(noneOption);
      let choiceIndex = readlineSync.keyInSelect(maybeSamePeople, `
        A record from the input file (${name.first} ${name.middles} ${name.last})
        sounds like the following people already in the database. Choose to create
        a new record or 
        Choose the person who is the same, or choose '${noneOption}'`,
        {
          cancel: 'Abort import'
        }
      );
      if (choiceIndex === -1) {
        console.log('Aborting import!');
        process.exit(1);
      }
      if (choiceIndex !== noneOptionIndex) {
        gedIdLookup[id] = maybeSamePeople[choiceIndex];
        return;
      }
    }

    newPeople.push({
      person: person,
      id: id
    });

  });

  console.log('Aborting import!');
  process.exit(1);

  let promises = newPeople.map(info => {
    return db.Person.create(info.person, {
      include: [{
        model: db.Name,
        as: 'Names'
      }]
    }).then(function(person) {
      gedIdLookup[info.id] = person;
    });
  });

  Promise.all(promises).then(function() {
    console.log('==============================================');
    console.log('All people have been created. Parsing Families');
    console.log('==============================================');
    // Use families to create Connections
    let cxnPromises = [];
    _.forEach(families, function(family, id) {
      try {

        // marriage
        if (family.HUSB && family.WIFE) {
          let marriagePromise = db.Connection.create({
            type: 'marriage',
            // person_a_id: gedIdLookup[family.HUSB].id,
            person_a_id: getPersonIdByGedId(family.HUSB),
            // person_b_id: gedIdLookup[family.WIFE].id
            person_b_id: getPersonIdByGedId(family.WIFE)
          });
          cxnPromises.push(marriagePromise);
        }

        // children
        let children = [].concat(family.CHIL).filter(c => c);
        children.forEach(function(childId) {

          if (family.HUSB) {
            let fatherPromise = db.Connection.create({
              type: 'parent_child',
              // person_a_id: gedIdLookup[family.HUSB].id,
              person_a_id: getPersonIdByGedId(family.HUSB),
              // person_b_id: gedIdLookup[childId].id
              person_b_id: getPersonIdByGedId(childId)
            });
            cxnPromises.push(fatherPromise);
          }

          if (family.WIFE) {
            let motherPromise = db.Connection.create({
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

db.Person.findAll({
  include: [{
    model: db.Name,
    as: 'Names'
  }]
}).then(people => {
  currentPeople = people;
  fs.createReadStream(argv.in, { encoding: 'utf8' })
  .pipe(through(function(chunk, enc, callback) {
    this.push(chunk);
    callback();
  }))
  .pipe(gedcom);
});




