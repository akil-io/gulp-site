const _ = require('lodash');

module.exports = function() {
	if (arguments.length == 2) {
		let [name, options] = arguments;
		return _.get(options.data.root, name);
	} else {
		let [options] = arguments;
		let name = options.hash.tpl.split('*').join(options.hash.val);
		return _.get(options.data.root, name);
	}
}