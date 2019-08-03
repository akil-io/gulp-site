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

const util = require('./lib/util');
const builder = require('./lib/builder');
const sitemap = require('./lib/sitemap');

const PRODUCTION = !!(yargs.argv.production);
const $ = plugins();

//CONFIGURATION
const config = util.loadConfig(util.path('config.yml'));
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

const fileTypes = {
	page: '{htm,html,hbs,handlebars,json,yml,yaml}',
	partial: '{htm,html,hbs,handlebars}',
	data: '{js,json,yml,yaml}',
	content: '{png,gif,jpg,jpeg,tif,tiff,svg,pdf,doc,docx,xls,xlsx,zip}'
};
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
      isProduction: PRODUCTION
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
    PRODUCTION && uncss.postcssPlugin(UNCSS_OPTIONS)
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

const copy = gulp.parallel(copyAssets, copyPublic, copyContent);

const build = gulp.series(clean, gulp.parallel(pages, javascript, images, copy), sass);

const generate = require('./lib/generator')({
	sitemap: PATHS.sitemap,
	pages: PATHS.pages,
	partials: PATHS.partials,
});

const favicon = function(done) {
  realFavicon.generateFavicon(Object.assign({}, faviconConfig, {
    masterPicture: util.path(PATHS.logo),
    dest: util.path(PATHS.public),
    markupFile: util.path(PATHS.faviconDataFile)
  }), function() {
    done();
  });
};

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

//EXPORTS
module.exports = {
	generate,
	favicon,
	build
};
exports.default = gulp.series(build, server, watch);