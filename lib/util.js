//const gulpUtil = require('gulp-util');
const fancyLog = require('fancy-log');
const yargs = require('yargs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');
const fs = require('fs');
const slash = require('slash');

exports.fileTypes = {
  page: '{htm,html,hbs,handlebars,json,yml,yaml}',
  partial: '{htm,html,hbs,handlebars}',
  data: '{js,json,yml,yaml}',
  content: '{png,gif,jpg,jpeg,tif,tiff,svg,pdf,doc,docx,xls,xlsx,zip}'
};
exports.root = path.resolve(path.dirname(__filename), '../');
exports.log = fancyLog.info;//gulpUtil.log;
exports.error = fancyLog.error;
exports.path = function (relativePath) {
	return path.join(process.cwd(), relativePath);
}
exports.local = function (relativePath) {
	return path.join(exports.root, relativePath);
}
exports.loadFiles = function(dir, pattern) {
  let files = [];

  dir = !Array.isArray(dir) ? [dir] : dir;

  for (let i in dir) {
  	let globPath = path.join(dir[i], pattern);
    files = files.concat(glob.sync(path.join(dir[i], pattern)));
  }

  return files;
}
exports.loadConfig = function (fileName, skipError = false) {
  try {
    let ymlFile = fs.readFileSync(fileName, 'utf8');
    return yaml.load(ymlFile);
  } catch(err) {
    if (skipError) return {};
    else throw err;
  }
}

exports.processRoot = function(page, root) {
  var pagePath = path.dirname(page);
  var rootPath = path.join(process.cwd(), root);

  var relativePath = path.relative(pagePath, rootPath);

  if (relativePath.length > 0) {
    relativePath += '/';
  }

  // On Windows, paths are separated with a "\"
  // However, web browsers use "/" no matter the platform
  return slash(relativePath);
}

let plugins = null;
exports.getPlugins = function() {
  if (!plugins) {
    let n = require('../package.json').name;
    let p = require(path.join(process.cwd(), './package.json'));
    plugins = Object.keys(Object.assign({}, p.dependencies || {}))
                    .filter(d => (d.slice(0, n.length) === n) && (d.length > n.length));
  }

  return plugins;
}