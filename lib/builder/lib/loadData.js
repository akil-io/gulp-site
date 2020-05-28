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
  let dataFiles = utils.loadFiles(dir, '*.{js,json,yml}');

  if (this.options.isProduction) {
    this.data.origin = this.options.origin;
    this.data.env = "production";
    this.data.cdn = this.options.cdn.root;
  } else {
    this.data.origin = `http://localhost:${this.options.port}`;
    this.data.env = "development";
  }

  if (this.options.cdn && this.options.cdn.js) this.data.js = this.options.cdn.js;
  if (this.options.cdn && this.options.cdn.css) this.data.css = this.options.cdn.css;

  for (let i in dataFiles) {
    //let file = fs.readFileSync(dataFiles[i]);
    let ext = path.extname(dataFiles[i]);
    let name = path.basename(dataFiles[i], ext);
    let data;

    if (ext === '.json' || ext === '.js') {
      delete require.cache[require.resolve(utils.path(dataFiles[i]))];
      data = require(utils.path(dataFiles[i]));
    }
    else if (ext === '.yml') {
      data = yaml.safeLoad(fs.readFileSync(dataFiles[i]));
    }

    this.data[name] = data;
  }

  let dataCatalogs = utils.loadFiles(dir, '*/index.{js,json,yml}');
  for (let i in dataCatalogs) {
    let ext = path.extname(dataFiles[i]);
    let name = path.dirname(path.relative(dir, dataCatalogs[i]));
    let data;

    if (ext === '.json' || ext === '.js') {
      delete require.cache[require.resolve(dataCatalogs[i])];
      data = require(dataCatalogs[i]);
    }
    else if (ext === '.yml') {
      data = yaml.safeLoad(fs.readFileSync(dataCatalogs[i]));
    }

    this.data[name] = data;
  }
}
