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

	let context = Object.assign({}, options.data.root, withData);

	if (withData.nestingLevel === undefined) {
		context.nestingLevel = 1;
	}
	if (withData.nestingLevel) {
		context.nestingLevel += 1;
	}

	return wrapTpl(Object.assign({}, context, {
		child: options.fn(Object.assign({}, context))
	}));
}