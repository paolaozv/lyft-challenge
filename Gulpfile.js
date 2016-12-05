var gulp = require('gulp');
var webserver = require('gulp-webserver');
var stylus = require('gulp-stylus');

gulp.task('lab', function(){
  console.log("Hola");
});

gulp.task('webserver', function() {
  gulp.src('public/')
    .pipe(webserver({
      fallback: 'index.html',
      livereload: true,
      directoryListing: false,
      open: true
    }));
});

gulp.task('styles', function () {
  return gulp.src('./src/stylus/main.styl')
    .pipe(stylus())
    .pipe(gulp.dest('./public/css'));
})

gulp.task('default', ['styles', 'webserver']);