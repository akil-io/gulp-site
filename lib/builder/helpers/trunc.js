module.exports = function (value, size = 60, options) {
	if (value.length > size) {
		return value.split(' ').reduce((a, c) => ((a.join(" ").length + c.length) < size) ? [...a, c] : a, []).join(" ") + '...';
	} else {
		return value;
	}
}