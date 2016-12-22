'use strict';

const proxyMiddleware = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');
let local;

try {
  local = require('./conf.local.js');
}
catch (e) {
  console.log('No conf.local.js present in gulp directory.  Server proxy will not work');
}

module.exports = function (baseDirs) {
  // server middleware

  let browserSyncConfig = {
    server: {
      baseDir: baseDirs,
      middleware: []
    },
    open: false
  };

  function proxyUrlToMock(url, mock) {
    return function (req, res, next) {
      if (req.url === url || url instanceof RegExp && url.test(req.url)) {
        var filename = path.resolve(__dirname, '..', 'mock', mock);
        res.setHeader('Content-Type', 'application/json');
        fs.createReadStream(filename).pipe(res);
        return;
      }
      next();
    };
  }

  // api calls
  var proxyCalls = proxyMiddleware('/v1', {
    target: local.apiServerUrl || '',
    changeOrigin: true
  });

  if (local.mockEndpoints && local.mockEndpoints.length > 0) {
    local.mockEndpoints.forEach(function (obj, index) {
      browserSyncConfig.server.middleware.push(proxyUrlToMock(obj.pattern, obj.json));
    });
  }

  browserSyncConfig.server.middleware.push(proxyCalls);
  return browserSyncConfig;
};
