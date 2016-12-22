const gulp = require('gulp');
const browserSync = require('browser-sync');
const spa = require('browser-sync-spa');
const conf = require('../conf/gulp.conf');

const browserSyncConf = require('../conf/browsersync.conf');
const browserSyncDistConf = require('../conf/browsersync-dist.conf');

browserSync.use(spa());

gulp.task('browsersync', browserSyncServe);
gulp.task('browsersync:dist', browserSyncDist);

function browserSyncServe(done) {
  browserSync.init(browserSyncConf([ conf.paths.tmp, conf.paths.src ]));
  done();
}

function browserSyncDist(done) {
  browserSync.init(browserSyncDistConf());
  done();
}
