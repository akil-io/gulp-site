const fs      = require('fs');
const path    = require('path');
const utils    = require('../../util');

/**
 * Looks for files with .html, .hbs, or .handlebars extensions within the given directory, and adds them as layout files to be used by pages.
 * @param {string} dir - Folder to check for layouts.
 */
 module.exports = function(dir) {
 	let layouts = utils.loadFiles([
 		utils.local('lib/builder/layouts'),
 		...utils.getPlugins().map(p => utils.path(`node_modules/${p}/src/layouts`)),
 		utils.path(dir)
 	], '**/*.{html,hbs,handlebars}');
 	
 	for (let i in layouts) {
 		let ext = path.extname(layouts[i]);
 		let name = path.basename(layouts[i], ext);
 		let file = fs.readFileSync(layouts[i]);
 		this.layouts[name] = this.Handlebars.compile(file.toString());
 	}
 }
