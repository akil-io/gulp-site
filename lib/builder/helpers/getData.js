const _ = require('lodash');

module.exports = function(name, options) {
	return _.get(options.data.root, name);
}