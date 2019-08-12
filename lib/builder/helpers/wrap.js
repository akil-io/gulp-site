const _ = require('lodash');

module.exports = function() {
	let name, withData, options;
	if (arguments.length == 3) {
		[name, withData, options] = arguments;
	} else {
		[name, options] = arguments;
		withData = {};
	}
	
	let wrapTpl = this.Handlebars.compile(this.Handlebars.partials[name]);

	return wrapTpl(Object.assign({}, options.data.root, withData, {
		child: options.fn(options.data.root)
	}));
}