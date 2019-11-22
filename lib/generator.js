const fs = require('fs-extra');
const path = require('path');
const yaml  = require('js-yaml');
const glob = require('glob');
const _ = require('lodash');
const { exec } = require('child_process');
const yargs = require('yargs');

const util = require('./util');
const Page = require('./builder/page');

module.exports = function generator(options) {
	const sitemap = util.path(options.sitemap);
	const pages = util.path(options.pages);
	const partials = util.path(options.partials);

	return function (done) {
		util.log(`read map from ${sitemap}`);

		const isCheck = !!yargs.argv.check;
		const isForced = !!yargs.argv.force;
		const isRestored = !!yargs.argv.restore;
		const isRewrite = !!yargs.argv.rewrite;

		//nothing to commit, working tree clean

		exec('git status', (error, stdout, stderr) => {
		  	const isSaved = stdout.indexOf('nothing to commit, working tree clean') !== -1;
			util.log(`check = ${isCheck}; force = ${isForced}; restore = ${isRestored}; saved = ${isSaved}`);

			if (!isSaved && !isForced) {
				util.log('You have unsaved chaged in working directory. Commit it or use --force param instead.');
				return done();
			}
		
			if (isRestored) {
				util.log('restore sitemap.yml from existed pages...');
				let site = isRewrite ? {} : yaml.safeLoad(fs.readFileSync(sitemap));
				let pageFiles = util.loadFiles(pages, `**/*.${util.fileTypes.page}`);
				let restoredPages = 0;

				util.log('existed pages: ', pageFiles.length);

				for (let pageFilePath of pageFiles) {
					pageFilePath = path.relative(pages, pageFilePath);
					let pageName = pageFilePath.replace(path.extname(pageFilePath), '').split(path.sep).join('_');
					let pageInstance = Page.fromFile(pages, pageFilePath, pageName);
					if (pageInstance) {
						let {name,type,data:{index,url}} = pageInstance;

						if (isRewrite || (site[name] === undefined)) {
							restoredPages++;

							if (!isCheck) {
								util.log(`restore ${name}: (${type};${index};${url})`);
								site[name] = {type,index,url};
							}
						}
					}
				}

				let siteMapContent = yaml.dump(site, null, '  ');
				util.log(`restored pages: ${restoredPages}`);

				if (!isCheck) {
					fs.outputFileSync(options.sitemap, siteMapContent);
				}

				return done();
			}

			let site = yaml.safeLoad(fs.readFileSync(sitemap));
			let pageFiles = util.loadFiles(pages, `**/*.${util.fileTypes.page}`).map(page => path.relative(pages, page).replace(path.extname(page), '').split(path.sep).join('_'));
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
								if (!isCheck) {
									util.log(`add widget: ${widget}`);
									fs.ensureFileSync(path.join(partials, `${widget}.html`));
								}
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
								if (!isCheck) {
									util.log(`add widget: ${widget}`);
									fs.ensureFileSync(path.join(partials, `${widget}.html`));
								}
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
								if (!isCheck) {
									util.log(`add widget: ${widget}`);
									fs.ensureFileSync(path.join(partials, `${widget}.html`));
								}
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

				if (!isCheck) {
					util.log(`add page: ${pageName} at ${pageFilePath}`);
					fs.outputFileSync(path.join(pages, pageFilePath), pageFileContent);
				}
			}

			done();
		});
	}
}