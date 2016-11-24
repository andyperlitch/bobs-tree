TMP_LOCATION=client/.tmp/generated-api
TRG_LOCATION=client/src/app/services/DefaultApi

swagger-codegen generate -i api/swagger/swagger.yaml -l typescript-angular -o "${TMP_LOCATION}"

cp $TMP_LOCATION/API/Client/* $TRG_LOCATION/
rm -rf $TMP_LOCATION
