let fs    = require('fs');
let path  = require('path');
let utils    = require('../../util');
let yaml  = require('js-yaml');
const stripBom = require('strip-bom');
const fm = require('front-matter');

/**
 * Looks for files with .js, .json, or .yml extensions within the given directory, and adds them as Handlebars letiables matching the name of the file.
 * @param {string} dir - Folder to check for data files.
 */
module.exports = function(dir) {
  let dataFiles = utils.loadFiles(dir, '**/*.{js,json,yml}');

  for (let i in dataFiles) {
    let file = fs.readFileSync(dataFiles[i]);
    let ext = path.extname(dataFiles[i]);
    let name = path.basename(dataFiles[i], ext);
    let data;

    if (ext === '.json' || ext === '.js') {
      delete require.cache[require.resolve(dataFiles[i])];
      data = require(dataFiles[i])
    }
    else if (ext === '.yml') {
      data = yaml.safeLoad(fs.readFileSync(dataFiles[i]));
    }
  }
}