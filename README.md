# bobs-tree

A tool for storing and viewing genealogical data. Love you grandpa bob!

## Converting Old GEDCOM files from Reunion

After some experimenting, it seems that the original .ged files exported from Reunion have "\r" carriage returns.
There are various tools for replacing these with the more standard "\n" character. I used the `mac2unix` utility,
installed along with the `dos2unix` utility (with homebrew, run `brew install dos2unix`). Then run:

```
node util/ged2json.js --in=path/to/file.ged --out=path/to/file.json
```

This creates a JSON representation of the gedcom file. Next step is to get this data into a DB.


## TODO
- [X] convert GEDCOM file from Reunion to json
- [ ] create data models
- [ ] create API spec
- [ ] visual design spec
- [ ] set up basic server with API and boilerplate client code
- [ ] create necessary mongodb schemas for people and photos (perhaps with [mongoose](http://mongoosejs.com/))
- [ ] import the json from GEDCOM conversion above into mongodb
- [ ] convert written names into some format that can then be imported into mongodb
- [ ] aggregate photos into one folder
- [ ] aggregate photo meta information into consumable JSON
- [ ] import photo meta from above into mongodb

## Resources

- [GEDCOM format](https://en.wikipedia.org/wiki/GEDCOM)
- [gedcom node modules](https://www.npmjs.com/search?q=gedcom)
- [dTree, a layout engine](https://github.com/ErikGartner/dTree)