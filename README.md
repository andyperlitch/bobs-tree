# bobs-tree

A tool for storing and viewing genealogical data. Love you grampa bob!


## Management of sequelize models and swagger API spec

This project uses an ORM called [sequelize](http://docs.sequelizejs.com/en/v3/) to define its models,
and another project called [swagger](http://swagger.io/) to define its server API. The following actions can
be performed regarding this setup:


### Syncing the Database

```bash
npm run sync-db
```

This will read the model definition files (which more or less map to db tables) and proceed to
sync the development database's structure accordingly. The development database is specified
in the file `server/config/config.json`.

**Use only on setup!!!** This will wipe the database beforehand. In the future, only migrations
will be used to do this, since it will preserve the data.


### Updating Swagger Definitions from Sequelize Models

```bash
npm run sequelize2swagger
```

This will generate swagger definitions from all models in `server/models/` (as `IPerson`, `IConnection`, etc)
and inject them into the main API spec file located at `api/swagger/swagger.yaml`.


### Creating Typescript Types for angular2

```bash
npm run swagger2ts
```


## Postgres Info

### Resources

- [Installation](https://wiki.postgresql.org/wiki/Detailed_installation_guides)
- [Users](https://www.postgresql.org/docs/8.0/static/user-manag.html)
- [Database Creation](https://www.postgresql.org/docs/9.0/static/sql-createdatabase.html)

### Creating the postgres user and database

Ensure postgres is installed and running.

```bash
source util/create_postgres_user.sh
```




## Converting Old GEDCOM files from Reunion

After some experimenting, it seems that the original .ged files exported from Reunion have "\r" carriage returns.
There are various tools for replacing these with the more standard "\n" character. I used the `mac2unix` utility,
installed along with the `dos2unix` utility (with homebrew, run `brew install dos2unix`). Then run:

```
node util/ged2json.js --in=path/to/file.ged --out=path/to/file.json
```

This creates a JSON representation of the gedcom file. Next step is to get this data into a DB.







## TODO (server)
- [X] convert GEDCOM file from Reunion to json
- [X] create data models
- [X] create API spec
- [X] import the json from GEDCOM conversion above into db
- [ ] set up basic server with API and boilerplate client code
- [ ] aggregate photos into one folder
- [ ] aggregate photo meta information into consumable JSON
- [ ] import photo meta from above into db
- [ ] visual design spec

## Resources

- [GEDCOM format](https://en.wikipedia.org/wiki/GEDCOM)
- [gedcom node modules](https://www.npmjs.com/search?q=gedcom)
- [dTree, a layout engine](https://github.com/ErikGartner/dTree)
- [swagger-codegen](https://github.com/swagger-api/swagger-codegen)