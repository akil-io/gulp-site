module.exports = function () {
	if (arguments.length == 2) {
		let [value, options] = arguments;
		return value.split(";").map(part => part.split("=")).reduce((a, c) => Object.assign(a, {
			[c[0]]: c[1]
		}), {});
	} else {
		let [options] = arguments;
		return options.hash;
	}
};