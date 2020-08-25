const yargs = require('yargs');
const path = require('path');
const util = require('./lib/util');
const extend = require('deepmerge');
const _ = require('lodash');

const PRODUCTION = !!(yargs.argv.production);

//CONFIGURATION
const DEFAULT_CONFIG = {
  PRODUCTION: PRODUCTION,
  PORT: 8080,
  ORIGIN: 'http://localhost:8080',
  INDEX: {
    sitemap: true,
    robots: true,
    disallow: []
  },
  COMPATIBILITY: [
    'last 2 versions',
    'ie >= 9',
    'ios >= 7',
    'android >= 4.4'
  ],
  UNCSS: {
    enabled: false,
    html: `dist/**/*.html`,
    ignore: [/^.is-.*/ig]
  },
  WEBPACK: {
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
  },
  FAVICON: require(util.local('./favicon.json')),
  PATHS: {
    dist: "dist",
    logo: 'src/assets/img/logo.png',
    sitemap: 'src/sitemap.yml',
    faviconDataFile: 'faviconData.json',
    pages: 'src/pages',
    layouts: 'src/layouts',
    partials: 'src/partials',
    templates: 'src/templates',
    public: 'src/public',
    assets: 'src/assets',
      data: 'src/data',
      helpers: 'src/helpers',
      sass: [],
      entries: ['/js/app.js'],
      styles: ['/scss/app.scss']
  },
  CDN: {
    root: undefined,
    js: [],
    css: []
  }
};
const CUSTOM_CONFIG = util.loadConfig(util.path('config.yml'), true);
let pluginConfigs = util.getPlugins().map(p => {
  let cfg = util.loadConfig(util.path(`node_modules/${p}/config.yml`), true);
  return {
    PATHS: {
      sass: _.get(cfg, 'PATHS.sass', []),
      entries: _.get(cfg, 'PATHS.entries', []).map(s => `node_modules/${p}/src/assets${s}`),
      styles: _.get(cfg, 'PATHS.styles', []).map(s => `node_modules/${p}/src/assets${s}`)
    },
    CDN: {
      js: _.get(cfg, 'CDN.js', []),
      css: _.get(cfg, 'CDN.css', [])
    }
  };
});
let CONFIG = extend({}, DEFAULT_CONFIG);
for (let configItem of pluginConfigs) {
  CONFIG = extend(CONFIG, configItem);
}

CONFIG = extend(CONFIG, CUSTOM_CONFIG);
try {
  CONFIG.SITE = util.loadConfig(util.path('src/data/site.yml'), true);
} catch (err) {
  CONFIG.SITE = {};
}

if (!CUSTOM_CONFIG.ORIGIN && CUSTOM_CONFIG.PORT) CONFIG.ORIGIN = `http://localhost:${CONFIG.PORT}`;

module.exports = CONFIG;