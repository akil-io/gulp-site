const Page = require('../page');
const _ = require('lodash');

module.exports = function() {
	if (arguments.length == 3) {
		let [pageName, query, options] = arguments;
		let page = Page.fromHelper(this, pageName);
		return _.get(page, query);
	} else {
		let [pageName, options] = arguments;
		let page = Page.fromHelper(this, pageName);
		return page;
	}
}
