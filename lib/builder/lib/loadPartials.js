const fs       = require('fs');
const path     = require('path');
const stripBom = require('strip-bom');
const utils    = require('../../util');

/**
 * Looks for files with .html, .hbs, or .handlebars extensions within the given directory, and adds them as Handlebars partials matching the name of the file.
 * @param {string} dir - Folder to check for partials.
 */
 module.exports = function(dir) {
 	let partials = utils.loadFiles([
 		utils.local('lib/builder/partials'),
 		...utils.getPlugins().map(p => utils.path(`node_modules/${p}/src/partials`)),
 		utils.path(dir)
 	], '**/*.{html,hbs,handlebars}');

 	for (let i in partials) {
 		let ext = path.extname(partials[i]);
 		let file = stripBom(fs.readFileSync(partials[i]).toString());
 		let name = path.basename(partials[i], ext);

 		this.Handlebars.registerPartial(name, file.toString());
 	}
 }
