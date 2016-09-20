## Creates the postgres user and database for bob's tree

# Check for postgres
if [[ command -v createuser >/dev/null 2>&1 ]]; then
  echo "Postgres command 'createuser' not found in path."
  echo "Check to see that you have installed Postgres!"
  echo "https://wiki.postgresql.org/wiki/Detailed_installation_guides"
  exit 1
fi
# Create the role (user, in postgres speak) to access the db
createuser -E bobstree
# Create the database and set the owner to bobstree
createdb --encoding=UTF-8 --owner=bobstree bobstree