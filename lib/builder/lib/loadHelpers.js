const fs   = require('fs');
const path = require('path');
const utils    = require('../../util');

/**
 * Looks for files with the .js extension within the given directory, and attempts to add them as Handlebars helpers.
 * @param {string} dir - Folder to check for helpers.
 */
module.exports = function(dir) {
  let helpers = utils.loadFiles([
    utils.local('lib/builder/helpers'),
    ...utils.getPlugins().map(p => utils.path(`node_modules/${p}/src/helpers`)),
    utils.path(dir)
  ], '**/*.js');

  for (let i in helpers) {
    let helper;
    let name = path.basename(helpers[i], '.js');

    try {
      if (this.Handlebars.helpers[name]){
        delete require.cache[require.resolve(path.join(helpers[i]))];
        this.Handlebars.unregisterHelper(name);
      }

      helper = require(path.join(helpers[i])).bind(this);
      this.Handlebars.registerHelper(name, helper);
    }
    catch (e) {
      console.warn('Error when loading ' + name + '.js as a Handlebars helper.', e);
    }
  }
}
