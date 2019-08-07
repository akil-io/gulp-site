const gulp = require('gulp');
const yargs = require('yargs');
const plugins = require('gulp-load-plugins');
const rimraf = require('rimraf');
const realFavicon = require('gulp-real-favicon');
const autoprefixer = require('autoprefixer');
const browser = require('browser-sync');
const named = require('vinyl-named');
const uncss = require('uncss');
const webpackStream = require('webpack-stream');
const webpack2 = require('webpack');
const path = require('path');
const fs = require('fs-extra');


const util = require('./lib/util');
const builder = require('./lib/builder');
const sitemap = require('./lib/sitemap');

const PRODUCTION = !!(yargs.argv.production);
const $ = plugins();

//CONFIGURATION
const config = Object.assign({
  DISALLOW: []
}, util.loadConfig(util.path('config.yml'), true));

const faviconConfig = require('./favicon.json');
const webpackConfig = {
  mode: (PRODUCTION ? 'production' : 'development'),
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [ "@babel/preset-env" ],
            compact: false
          }
        }
      }
    ]
  },
  devtool: !PRODUCTION && 'source-map'
}

const fileTypes = util.fileTypes;
const PATHS = Object.assign({
	dist: "dist",
	logo: 'src/assets/img/logo.png',
	sitemap: 'src/sitemap.yml',
	faviconDataFile: 'faviconData.json',
	pages: 'src/pages',
	layouts: 'src/layouts',
	partials: 'src/partials',
	public: 'src/public',
	assets: 'src/assets',
    data: 'src/data',
    helpers: 'src/helpers',
    sass: [],
    entries: ['/js/app.js'],
    styles: ['/scss/app.scss']
}, config.PATHS);
const UNCSS_OPTIONS = Object.assign({
	html: `${PATHS.dist}/**/*.html`,
	ignore: []
}, config.UNCSS_OPTIONS);
const COMPATIBILITY = config.COMPATIBILITY || [
	'last 2 versions',
	'ie >= 9',
	'ios >= 7',
	'android >= 4.4'
];


//TASK FUNCTIONS
function pages() {
  return gulp.src(`${PATHS.pages}/**/*.${fileTypes.page}`)
    .pipe(builder({
      root: PATHS.pages,
      layouts: PATHS.layouts,
      partials: PATHS.partials,
      data: PATHS.data,
      helpers: PATHS.helpers,
      isProduction: PRODUCTION,
      origin: config.ORIGIN,
      port: config.PORT
    }))
    .pipe(sitemap({
      origin: config.ORIGIN,
      root: PATHS.pages,
      disallow: config.DISALLOW,
      robots: true
    }))
    .pipe(gulp.dest(PATHS.dist));
}

function clean(done) {
  rimraf(util.path(PATHS.dist), done);
}

function copyAssets() {
  return gulp.src([
  		`${PATHS.assets}/**/*`,
  		`!${PATHS.assets}/{img,js,scss}/**/*`
  	])
    .pipe(gulp.dest(PATHS.dist + '/assets'));
}

function copyPublic() {
  return gulp.src(`${PATHS.public}/**/*`)
    .pipe(gulp.dest(PATHS.dist + '/'));
}

function copyContent() {
	return gulp.src([
  		`${PATHS.data}/**/*.${fileTypes.content}`
  	])
    .pipe(gulp.dest(PATHS.dist + '/files'));
}

function resetPages(done) {
  builder.refresh();
  done();
}

function sass() {
  const postCssPlugins = [
    autoprefixer({ overrideBrowserslist: COMPATIBILITY }),
    PRODUCTION && uncss.postcssPlugin(Object.assign({}, UNCSS_OPTIONS, {
      banner: false,
      timeout: 0,
      inject: function (window) {
        window.document.querySelectorAll('script').forEach(s => s.remove());
      }/*,
      jsdom: {
        features: {
            FetchExternalResources: ['script'],
            ProcessExternalResources: ['script']
        },
        runScripts: 'dangerously',
      }*/
    }))
  ].filter(Boolean);

  return gulp.src(PATHS.styles.map(entry => `${PATHS.assets}${entry}`))
  	.pipe($.sourcemaps.init())
    .pipe($.sass({
      includePaths: PATHS.sass
    })
    .on('error', $.sass.logError))
    .pipe($.postcss(postCssPlugins))
    .pipe($.if(PRODUCTION, $.cleanCss({ compatibility: 'ie9' })))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(PATHS.dist + '/assets/css'))
    .pipe(browser.reload({ stream: true }));
}

function javascript() {
  return gulp.src(PATHS.entries.map(entry => `${PATHS.assets}${entry}`))
    .pipe(named())
    .pipe($.sourcemaps.init())
    .pipe(webpackStream(webpackConfig, webpack2))
    .pipe($.if(PRODUCTION, $.uglify()
      .on('error', e => { util.log(e); })
    ))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(PATHS.dist + '/assets/js'));
}

function images() {
  return gulp.src(`${PATHS.assets}/img/**/*`)
    .pipe($.if(PRODUCTION, $.imagemin([
      $.imagemin.jpegtran({ progressive: true }),
    ])))
    .pipe(gulp.dest(PATHS.dist + '/assets/img'));
}

function server(done) {
  browser.init({
    server: PATHS.dist, port: config.PORT
  }, done);
}

// Reload the browser with BrowserSync
function reload(done) {
  browser.reload();
  done();
}

function watch() {
  gulp.watch([
  		`${PATHS.assets}/**/*`,
  		`!${PATHS.assets}/{img,js,scss}/**/*`
  ], copyAssets);
  gulp.watch(PATHS.public, copyPublic);
  gulp.watch(`${PATHS.pages}/**/*.${fileTypes.page}`).on('all', gulp.series(pages, browser.reload));
  gulp.watch([
  	`${PATHS.layouts}/**/*.${fileTypes.partial}`,
  	`${PATHS.partials}/**/*.${fileTypes.partial}`
  ]).on('all', gulp.series(resetPages, pages, browser.reload));
  gulp.watch(`src/data/**/*.${fileTypes.data}`).on('all', gulp.series(resetPages, pages, browser.reload));
  gulp.watch(`${PATHS.helpers}/**/*.js`).on('all', gulp.series(resetPages, pages, browser.reload));
  gulp.watch(`${PATHS.assets}/scss/**/*.scss`).on('all', sass);
  gulp.watch(`${PATHS.assets}/js/**/*.js`).on('all', gulp.series(javascript, browser.reload));
  gulp.watch(`${PATHS.assets}/img/**/*`).on('all', gulp.series(images, browser.reload));
}

function initTemplate(done) {
  fs.copy(
    util.local('template'),
    util.path('/'),
    done
  );
}

function create(done) {
  if (yargs.argv._[1] === undefined) {
    util.error('no target specified');
    return done();
  }
  let [ category, target ] = yargs.argv._[1].split(":");
  if (['layout','partial'].indexOf(category) === -1) {
    util.error('category can be only "layout" or "partial"');
    return done();
  }
  let sourcePath = util.local(`/lib/builder/${category}s/${target}.html`);
  let targetPath = util.path(`/src/${category}s/${target}.html`);
  if (!fs.existsSync(sourcePath)) {
    util.error('source file does not exists');
    return done();
  }
  if (fs.existsSync(targetPath)) {
    util.error('target file already exists');
    return done();
  }

  util.log(`create custom ${target} ${category}`);

  fs.copy(
    sourcePath,
    targetPath,
    done
  );
}

const favicon = function(done) {
  realFavicon.generateFavicon(Object.assign({}, faviconConfig, {
    masterPicture: util.path(PATHS.logo),
    dest: util.path(PATHS.public),
    markupFile: util.path(PATHS.faviconDataFile)
  }), function() {
    done();
  });
};

const generate = require('./lib/generator')({
  sitemap: PATHS.sitemap,
  pages: PATHS.pages,
  partials: PATHS.partials,
});

const copy = gulp.parallel(copyAssets, copyPublic, copyContent);

const build = gulp.series(clean, gulp.parallel(pages, javascript, images, copy), sass);

const init = gulp.series(initTemplate, generate);

//EXPORTS
module.exports = {
	generate,
	favicon,
	build,
  init,
  create
};
module.exports.default = gulp.series(build, server, watch);