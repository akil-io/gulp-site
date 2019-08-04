const extend = require('deepmerge');
const fm = require('front-matter');
const fs = require('fs-extra');
const path = require('path');
const stripBom = require('strip-bom');
const processRoot = require('./lib/processRoot');
const yaml  = require('js-yaml');
const util = require('../util');

class Page {
	constructor(site, file) {
		let page, pageAttributes;
		let ext = path.extname(file.path);

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
	    //apply site.yml
	    this.name = path.relative(site.root, file.path).replace(path.extname(file.path), '').split(path.sep).join("_");

	    this.base = path.relative(site.root, path.dirname(file.path));
	    this.layout = page.attributes.layout || 'default';

	    //console.log(`RENDER ${pageName} at ${pageData.url}`);
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
	}

	getPageTemplate(data) {
	  if (Object.keys(data).length === 0) return "";
	  if (typeof data.body === "string") return data.body;

	  if (typeof data.body === "object") {
	    return Object.keys(data.body).map(partial => `{{#with body.${partial}}}{{> ${partial}}}{{/with}}`).join("\n");
	  } else {
	    return "";
	  }
	}

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

	static fromHelper(context, pageName) {
		let page = pageName.split("_");
		let pBase = page.slice(0, -1);
		let pName = page.pop();

		let pPath = util.path(path.join(context.options.root, '/' + ((pageName === 'index') ? '' : pBase.join(path.sep))));
		let found = util.loadFiles(
			pPath,
			`${pName}.{htm,html,hbs,handlebars,json,yml,yaml}`
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
}

module.exports = Page;