const _ = require('lodash');

module.exports = function() {
	let name, root, options;
	if (arguments.length === 1) {
		[options] = arguments;
		if (options && options.hash && options.hash.tpl && options.hash.val) {
			name = options.hash.tpl.split('*').join(options.hash.val);
		} else {
			return null;
		}
	}
	if (arguments.length === 2) {
		[name, options] = arguments;
	}
	if (arguments.length === 3) {
		[root, name, options] = arguments;
	}

	return _.get(root, name);
}