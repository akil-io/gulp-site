const gulpUtil = require('gulp-util');
const yargs = require('yargs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');
const fs = require('fs');

exports.root = path.resolve(path.dirname(__filename), '../');
exports.log = gulpUtil.log;
exports.error = function (msg) {
	return exports.log(gulpUtil.colors.red(msg));
};
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
