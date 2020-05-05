module.exports = function() {
	if (arguments.length === 2) {
		let [name, options] = arguments;
		if (this.Handlebars && this.Handlebars.partials[name]) {
			//let wrapTpl = this.Handlebars.compile(this.Handlebars.partials[name]);
			let wrapTpl = (typeof this.Handlebars.partials[name] === "function") ? this.Handlebars.partials[name] : this.Handlebars.compile(this.Handlebars.partials[name]);

			let context = Object.assign({}, options.data.root, options.hash);
			return wrapTpl(context);
		} else {
			return `!!! partial ${name} not found !!!`;
		}
	}

	if (arguments.length === 3) {
		let [name, withData, options] = arguments;
		if (this.Handlebars && this.Handlebars.partials[name]) {
			//let wrapTpl = this.Handlebars.compile(this.Handlebars.partials[name]);
			let wrapTpl = (typeof this.Handlebars.partials[name] === "function") ? this.Handlebars.partials[name] : this.Handlebars.compile(this.Handlebars.partials[name]);

			let context = Object.assign({}, options.data.root, withData, options.hash);
			return wrapTpl(context);
		} else {
			return `!!! partial ${name} not found !!!`;
		}
	}

	return;
}