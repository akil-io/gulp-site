const _ = require('lodash');

module.exports = function() {
	let name, withData, options, hash;
	if (arguments.length == 3) {
		[name, withData, options] = arguments;
		withData = Object.assign({}, withData, options.hash || {});
	} else {
		[name, options] = arguments;
		withData = options.hash || {};
	}
	
	let wrapTpl = (typeof this.Handlebars.partials[name] === "function") ? this.Handlebars.partials[name] : this.Handlebars.compile(this.Handlebars.partials[name]);

	return wrapTpl(Object.assign({}, options.data.root, withData, {
		child: options.fn(options.data.root)
	}));
}