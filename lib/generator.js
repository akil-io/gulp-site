const fs = require('fs-extra');
const path = require('path');
const yaml  = require('js-yaml');
const glob = require('glob');
const _ = require('lodash');
const util = require('./util');

module.exports = function generator(options) {
	const sitemap = util.path(options.sitemap);
	const pages = util.path(options.pages);
	const partials = util.path(options.partials);

	return function (done) {
		util.log(`read map from ${sitemap}`);

		let site = yaml.safeLoad(fs.readFileSync(sitemap));
		let pageFiles = util.loadFiles(pages, '**/*.{json,htm,html,hbs,handlebars}').map(page => path.relative(pages, page).replace(path.extname(page), '').split(path.sep).join('_'));
		let sitePages = Object.keys(site);
		let existed = _.intersection(pageFiles, sitePages);
		let newPages = _.difference(sitePages, existed);

		util.log('defined pages: ', sitePages.length);
		util.log('existed pages: ', existed.length);
		util.log('new pages: ', newPages.length);

		for (let pageName of newPages) {
			let pageFilePath, pageFileContent;
			pageFilePath = pageName.split("_").join(path.sep);
			let body = "<p>empty</p>";

			switch (site[pageName].type) {
				case "json":
					pageFilePath = `${pageFilePath}.json`;
					if (_.isArray(site[pageName].body)) {
						body = {};
						for (let widget of site[pageName].body) {
							body[widget] = {};
							util.log(`add widget: ${widget}`);
							fs.ensureFileSync(path.join(partials, `${widget}.html`));
						}
					}
					pageFileContent = JSON.stringify({
						layout: "default",
						url: site[pageName].url,
						title: site[pageName].title || "",
						description: site[pageName].description || "",
						keywords: site[pageName].keywords || "",
						index: (site[pageName].index !== undefined) ? site[pageName].index : true,
						body: body
					}, null, '  ');
					break;
				case "yaml":
					pageFilePath = `${pageFilePath}.yml`;
					if (_.isArray(site[pageName].body)) {
						body = {};
						for (let widget of site[pageName].body) {
							body[widget] = {};
							util.log(`add widget: ${widget}`);
							fs.ensureFileSync(path.join(partials, `${widget}.html`));
						}
					}
					pageFileContent = yaml.dump({
						layout: "default",
						url: site[pageName].url,
						title: site[pageName].title || "",
						description: site[pageName].description || "",
						keywords: site[pageName].keywords || "",
						index: (site[pageName].index !== undefined) ? site[pageName].index : true,
						body: body
					}, null, '  ');
					break;
				default:
					pageFilePath = `${pageFilePath}.html`;
					if (_.isArray(site[pageName].body)) {
						body = [];
						for (let widget of site[pageName].body) {
							body.push(`{{> ${widget}}}`);
							util.log(`add widget: ${widget}`);
							fs.ensureFileSync(path.join(partials, `${widget}.html`));
						}
						body = body.join('\n');
					}
					pageFileContent = [];
					pageFileContent.push('---');
					pageFileContent.push('layout: default');
					pageFileContent.push('url: ' + site[pageName].url);
					pageFileContent.push('title: ' + (site[pageName].title || ""));
					pageFileContent.push('description: ' + (site[pageName].description || ""));
					pageFileContent.push('keywords: ' + (site[pageName].keywords || ""));
					pageFileContent.push('index: ' + ((site[pageName].index === false) ? 'false' : 'true'));
					pageFileContent.push('---');
					pageFileContent.push(body);
					pageFileContent = pageFileContent.join("\n");
					break;
			}

			util.log(`add page: ${pageName} at ${pageFilePath}`);
			fs.outputFileSync(path.join(pages, pageFilePath), pageFileContent);
		}
	}

	done();
}