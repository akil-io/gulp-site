module.exports = function () {
	if (arguments.length == 2) {
		let [str, options] = arguments;
		return str.split(" ");
	}
	if (arguments.length == 3) {
		let [str, ch, options] = arguments;
		return str.split(ch);
	}

	return [];
};