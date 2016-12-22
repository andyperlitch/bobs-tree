set -e
TMP_LOCATION=client/.tmp/generated-api
TRG_LOCATION=client/src/app/services/DefaultApi
GENERATOR=typescript-angular
GENERATOR_TARGET_DIR=API/Client
# GENERATOR=typescript-angular2
# GENERATOR_TARGET_DIR=api

echo "swagger2ts.sh: using the '${GENERATOR}' generator to create client files."
rm -rf $TMP_LOCATION
mkdir -p $TMP_LOCATION
swagger-codegen generate -i api/swagger/swagger.yaml -l $GENERATOR -o "${TMP_LOCATION}"
mkdir -p $TRG_LOCATION
cp $TMP_LOCATION/$GENERATOR_TARGET_DIR/* $TRG_LOCATION/
rm -rf $TMP_LOCATION
echo "swagger2ts.sh: success!"
