const extend = require('deepmerge');
const fm = require('front-matter');
const fs = require('fs-extra');
const path = require('path');
const stripBom = require('strip-bom');
const processRoot = require('./lib/processRoot');
const yaml  = require('js-yaml');
const util = require('../util');

/**
 * Gather and build data for every page
 */
class Page {
	constructor(site, file) {
		let page, pageAttributes;
		let ext = path.extname(file.path);

		//What type of out page?
	    switch (ext) {
	      case '.yaml':
	      case '.yml':
	      	this.type = 'yaml';
	        pageAttributes = yaml.load(file.contents);
	        page = {
	          attributes: pageAttributes,
	          body: this.getPageTemplate(pageAttributes)
	        };
	        break;
	      case '.json':
	      	this.type = "json";
	        pageAttributes = JSON.parse(file.contents);
	        page = {
	          attributes: pageAttributes,
	          body: this.getPageTemplate(pageAttributes)
	        };
	        break;
	      default:
	      	this.type = "html";
	        page = fm(stripBom(file.contents));
	    }

	    this.site = site;
	    this.source = file.path;
	    this.attributes = page.attributes;
	    this.body = page.body;
	    this.path = file.path.replace(ext, '.html');
	    // Build page data with globals
	    this.data = extend({}, site.data);
	    // Add any data from stream plugins
	    this.data = (file.data) ? extend(this.data, file.data) : this.data;
	    // Add this page's front matter
	    this.data = extend(this.data, page.attributes);
	    // Get unique page name
	    this.name = path.relative(site.root, file.path).replace(path.extname(file.path), '').split(path.sep).join("_");

	    // Select layout
	    this.base = path.relative(site.root, path.dirname(file.path));
	    this.layout = page.attributes.layout || 'default';

	    // Build page URL and destination path
	    if (this.data.url) {
	      if (this.data.url === "/") {
	        this.path = path.join(
	          process.cwd(), 
	          site.root, 
	          "index.html");
	      } else {
	        this.path = path.join(
	          process.cwd(), 
	          site.root, 
	          ...this.data.url.split('/'),
	          "index.html"
	        );
	        if (this.data.url.substr(-1) != '/') this.data.url = this.data.url + '/';
	      }
	    } else {
	      this.data.url = path.join(site.root, path.basename(file.path)).replace(path.delimiter, '/');
	    }

	    if (this.data.index === undefined) this.data.index = true;

	    // Finish by adding constants
	    this.data = extend(this.data, {
	      page: this.name,
	      layout: this.layout,
	      root: util.processRoot(this.path, site.root)
	    });

	    if (!this.data.cdn) {
	    	this.data.cdn = `${this.data.root}assets/`;
	    }
	}

	getPathFromUrl(pageUrl) {
		let pagePath = this.path;
		if (pageUrl === "/") {
			pagePath = path.join(
			  process.cwd(), 
			  this.site.root, 
			  "index.html");
		} else {
			pagePath = path.join(
			  process.cwd(), 
			  this.site.root, 
			  ...pageUrl.split('/'),
			  "index.html"
			);
			if (pageUrl.substr(-1) != '/') pageUrl = pageUrl + '/';
		}

		return { pagePath, pageUrl };
	}

	/**
	 * Build pages body template if page defined with yaml or json
	 * @param  {Object} data Page file data
	 * @return {String}      Handlebars template
	 */
	getPageTemplate(data) {
	  if (Object.keys(data).length === 0) return "";
	  if (typeof data.body === "string") return data.body;

	  if (typeof data.body === "object") {
	    return Object.keys(data.body).map(partial => `{{#with body.${partial}}}{{> ${partial}}}{{/with}}`).join("\n");
	  } else {
	    return "";
	  }
	}

	/**
	 * Instantiate Page object from lib/render.js process
	 * @param  {Object} context Builder "this" context
	 * @param  {Object} file    Vinyl file object
	 * @return {Page}         Page class instance
	 */
	static fromRender(context, file) {
		return new Page({
	      data: context.data,
	      root: context.options.root
	    }, {
	    	data: file.data,
	    	path: file.path,
	    	contents: file.contents.toString()
	    });
	}

	/**
	 * Instantiate Page object from helpers/* functions
	 * @param  {Object} context  Helper "this" context
	 * @param  {String} pageName Which page to read by name
	 * @return {Page}          Page class instance
	 */
	static fromHelper(context, pageName) {
		let page = pageName.split("_");
		let pBase = page.slice(0, -1);
		let pName = page.pop();

		let pPath = util.path(path.join(context.options.root, '/' + ((pageName === 'index') ? '' : pBase.join(path.sep))));
		let found = util.loadFiles(
			pPath,
			`${pName}.${util.fileTypes.page}`
		);

		let pageFile = found.pop();
		if (!pageFile) return null;

		let pageContents = fs.readFileSync(pageFile);

		return new Page({
	      data: {},
	      root: context.options.root
	    }, {
	    	data: {},
	    	path: pageFile,
	    	contents: pageContents.toString()
	    });
	}

	/**
	 * Instantiate Page object from given file
	 * @param  {String} pagesRoot path to pages root folder
	 * @param  {String} pagePath where page file located
	 * @param  {String} pageName Which page to read by name
	 * @return {Page}          Page class instance
	 */
	static fromFile(pagesRoot, pagePath, pageName) {
		let pageFile = path.join(pagesRoot, pagePath);
		let pageContents = fs.readFileSync(pageFile);
		if (!pageContents) return null;

		return new Page({
	      data: {},
	      root: pagesRoot
	    }, {
	    	data: {},
	    	path: pageFile,
	    	contents: pageContents.toString()
	    });
	}
}

module.exports = Page;