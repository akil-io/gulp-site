const _ = require('lodash');

module.exports = function() {
	let name, root, options;
	if (arguments.length === 1 && options.hash.tpl && options.hash.val) {
		[options] = arguments;
		name = options.hash.tpl.split('*').join(options.hash.val);
	}
	if (arguments.length === 2) {
		[name, options] = arguments;
	}
	if (arguments.length === 3) {
		[root, name, options] = arguments;
	}

	return _.get(root, name);
}