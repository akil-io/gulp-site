const _ = require('lodash');

module.exports = function (value, type, options) {
	let method = `is${type[0].toUpperCase()}${type.substr(1)}`;
	return _[method](value);
}