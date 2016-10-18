'use strict';

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

function trimName(str) {
  return (typeof str === 'string' ? str.trim() : null);
}

function findByName(first, middles, last, peopleSet) {
  return peopleSet.filter(p => {
    return _.some(p.Names, n => {
      return matches(n.first, first) && matches(n.last, last);
    });
  });
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

function connectByGedIds(person_a_ged_id, person_b_ged_id, type_of_connection) {

  let person_a_id = getPersonIdByGedId(person_a_ged_id);
  let person_b_id = getPersonIdByGedId(person_b_ged_id);

  return db.Connection.create({
    type: type_of_connection,
    // person_a_id: gedIdLookup[family.WIFE].id,
    person_a_id: person_a_id,
    // person_b_id: gedIdLookup[childId].id
    person_b_id: person_b_id
  });
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
  console.log('===============\n');
  _.forEach(individuals, function(person_data, id) {

    let person = {};

    // names
    let nameRE = /^([^\s]+\s)?([^\/]*)?\s?(?:\/([^\/]+)\/)?$/ig;
    let nameString,
        first,
        nickname,
        middles,
        last,
        suffix;
    if (typeof person_data.NAME === 'string') {
      nameString = person_data.NAME;
    } else if (_.isObject(person_data.NAME) && typeof person_data.NAME.value === 'string') {
      nameString = person_data.NAME.value;
      if (typeof person_data.NAME.children.NSFX === 'string') {
        // nickname = person_data.NAME.children.NSFX;
        console.log(`Is "${person_data.NAME.children.NSFX}" a nickname or a suffix for ${person_data.NAME}?`);
        let choiceIndex = readlineSync.keyInSelect(
          [ 'suffix', 'nickname'  ],
          'Pick One',
          { cancel: 'Abort import' }
        );
        switch (choiceIndex) {
          case 0:
            suffix = person_data.NAME.children.NSFX;
            break;
          case 1:
            nickname = person_data.NAME.children.NSFX;
            break;
          default:
            console.log('Import has been aborted. No data was written to the database.');
            process.exit(1);
            break;
        }
      }
    }
    let matches = nameRE.exec(nameString);
    first = matches[1];
    middles = matches[2];
    last = matches[3];

    // Birth date
    let birth_date;
    if (person_data.BIRT && typeof person_data.BIRT.DATE === 'string' && person_data.BIRT.DATE.trim()) {
      try {
        birth_date = new Date(person_data.BIRT.DATE.toLowerCase());
        if (isNaN(birth_date)) {
          throw new Error('Birth date was not parsable: ', person_data.BIRT.DATE);
        }
      } catch (e) {
        console.warn(`WARNING: A birth date was not parseable for ${first} ${middles || ''} ${last}`);
        birth_date = undefined;
      }
    }

    let isUnnamed = (first + '').toLowerCase().trim() === 'unnamed' || typeof first === 'undefined';

    // name
    person.Names = [{
      start_date: birth_date,
      change_reason: 'given',
      first: trimName(first || middles),
      nickname: trimName(nickname),
      middles: trimName(middles),
      last: trimName(last || middles || first || 'UNKNOWN'),
      suffix: trimName(suffix)
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
      console.log('WARNING: No gender found for: ', person_data);
    }


    person.education = stringifyField(person_data.EDUC);

    person.religion = stringifyField(person_data.RELI);

    person.occupation = stringifyField(person_data.OCCU);

    // notes -> biography
    if (person_data.NOTE) {
      person.biography = getNoteByNoteId(person_data.NOTE);
    }

    let name = person.Names[0];

    // Check for duplicate in this imported set
    let duplicateNewEntry = findByName(name.first, name.middles, name.last, newPeople.map(p => p.person))
      .filter(p => {
        if (!p.birth_date || !person.birth_date) {
          return true;
        }
        if (p.birth_date.getFullYear() !== person.birth_date.getFullYear()) {
          return false;
        }
      });
    if (duplicateNewEntry.length && !isUnnamed) {
      let duplicate = duplicateNewEntry[0];
      console.log('The following two people were found in the dataset being imported:\n' +
                  JSON.stringify(duplicate, 0, 3) + '\n\n\n' +
                  JSON.stringify(person, 0, 3) + '\n');
                  // `   - ${db.Name.Instance.prototype.toString.call(name)}\n` +
                  // `   - ${db.Name.Instance.prototype.toString.call(duplicateNewEntry[0].Names[0])}`);
      let choiceIndex = readlineSync.keyInSelect(
        ['Keep both', 'Use the first one', 'Use the second one'],
        'Pick one',
        {
          cancel: 'Abort import'
        }
      );
      if (choiceIndex === -1) {
        console.log('Import has been aborted. No data was written to the database.');
        process.exit(1);
      }
      if (choiceIndex === 1) {
        newPeople.filter(info => info.person === duplicate)[0].ids.push(id);
        return;
      }
      if (choiceIndex === 2) {
        let curEntry = newPeople.filter(info => info.person === duplicate)[0];
        curEntry.ids.push(id);
        curEntry.person = person;
      }

    }

    newPeople.push({
      person: person,
      ids: [id]
    });

  });

  let promises = newPeople.map(info => {

    let person = info.person;
    let ids = info.ids;

    // Check for duplicate in DB
    let name = person.Names[0];
    let isUnnamed = (name.first + '').toLowerCase().trim() === 'unnamed' || typeof name.first === 'undefined';
    let existingMatches = findByName(name.first, name.middles, name.last, currentPeople);
    if (existingMatches.length > 0 && !isUnnamed) {

      let maybeSamePeople = existingMatches.map(p => {
        return JSON.stringify(p, 0, 3);
        // let names = p.Names.map(n => db.Name.Instance.prototype.toString.call(n)).join(' a.k.a. ');
        // if (p.birth_date) {
        //   names += `, born: ${new Date(p.birth_date).toDateString()}`;
        // }
        // return names;
      });
      let noneOption = 'Create new person';
      let noneOptionIndex = 0;
      maybeSamePeople.unshift(noneOption);
      console.log(`A record from the input file (${JSON.stringify(person, 0, 3)})` +
                  ' sounds like the following people already in the database. \nChoose the person who' +
                  ` is the same, or choose '${noneOption}'`);
      let choiceIndex = readlineSync.keyInSelect(
        maybeSamePeople,
        'Pick One',
        {
          cancel: 'Abort import'
        }
      );
      if (choiceIndex === -1) {
        console.log('Import has been aborted. No data was written to the database.');
        process.exit(1);
      }
      if (choiceIndex !== noneOptionIndex) {

        let existingPerson = existingMatches[choiceIndex - 1];

        // Existing person chosen, choose what to do with import data.
        console.log('What would you like to do with the import data?');
        let dataChoice = readlineSync.keyInSelect(
          ['Update existing model in DB', 'Drop'],
          'Pick One',
          {
            cancel: 'Abort import'
          }
        );
        if (dataChoice === -1) {
          console.log('Import has been aborted. No data was written to the database.');
          process.exit(1);
        }
        if (dataChoice === 0) {
          // return update promise
          return existingPerson
            .set(person)
            .save()
            .then(function() {
              ids.forEach(id => { gedIdLookup[id] = existingPerson; });

              return Promise.resolve(existingPerson);
            });

        }
        ids.forEach(id => { gedIdLookup[id] = existingPerson; });
        return Promise.resolve(existingPerson);
      }
    }

    return db.Person.create(info.person, {
      include: [{
        model: db.Name,
        as: 'Names'
      }]
    }).then(function(person) {
      info.ids.forEach(id => gedIdLookup[id] = person);
    });
  });

  Promise.all(promises).then(function() {
    console.log('==============================================');
    console.log('All people have been created. Parsing Families');
    console.log('==============================================');
    // Use families to create Connections
    let cxnPromises = [];
    _.forEach(families, function(family) {
      try {

        // marriage
        if (family.HUSB && family.WIFE) {
          cxnPromises.push(
            connectByGedIds(family.HUSB, family.WIFE, 'marriage')
          );
        }

        // children
        let children = [].concat(family.CHIL).filter(c => c);
        children.forEach(function(childId) {

          if (family.HUSB) {
            cxnPromises.push(
              connectByGedIds(family.HUSB, childId, 'parent_child')
            );
          }

          if (family.WIFE) {
            cxnPromises.push(
              connectByGedIds(family.WIFE, childId, 'parent_child')
            );
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




