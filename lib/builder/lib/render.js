const extend = require('deepmerge');
const fm = require('front-matter');
const path = require('path');
const through = require('through2');
const stripBom = require('strip-bom');
const processRoot = require('./processRoot');
const yaml  = require('js-yaml');
const util = require('../../util');

module.exports = function() {
  return through.obj(render.bind(this));
}

function getPageTemplate(data) {
  if (Object.keys(data).length === 0) return "";
  if (typeof data.body === "string") return data.body;

  if (typeof data.body === "object") {
    return Object.keys(data.body).map(partial => `{{#with body.${partial}}}{{> ${partial}}}{{/with}}`).join("\n");
  } else {
    return "";
  }
}

/**
 * Renders a page with a layout. The page also has access to any loaded partials, helpers, or data.
 * @param {object} file - Vinyl file being parsed.
 * @param {string} enc - Vinyl file encoding.
 * @param {function} cb - Callback that passes the rendered page through the stream.
 */
function render(file, enc, cb) {
  let pageData, pageAttributes, page, pageType, layout, layoutTemplate, basePath, pageTemplate;
  try {
    // Get the HTML for the current page and layout
    
    pageType = path.extname(file.path);
    util.log('render: ', path.relative(this.options.root, file.path));

    switch (pageType) {
      case '.yaml':
      case '.yml':
        pageAttributes = yaml.load(file.contents);
        page = {
          attributes: pageAttributes,
          body: getPageTemplate(pageAttributes)
        };
        break;
      case '.json':
        pageAttributes = JSON.parse(file.contents);
        page = {
          attributes: pageAttributes,
          body: getPageTemplate(pageAttributes)
        };
        break;
      default:
        page = fm(stripBom(file.contents.toString()));
    }
    file.path = file.path.replace(pageType, '.html');

    // Determine which layout to use
    basePath = path.relative(this.options.root, path.dirname(file.path));
    layout =
      page.attributes.layout ||
      (this.options.pageLayouts && this.options.pageLayouts[basePath]) ||
      'default';
    layoutTemplate = this.layouts[layout];

    if (!layoutTemplate) {
      if (layout === 'default') {
        throw new Error('Builder error: you must have a layout named "default".');
      }
      else {
        throw new Error('Builder error: no layout named "'+layout+'" exists.');
      }
    }

    // Now create Handlebars templates out of them
    pageTemplate = this.Handlebars.compile(page.body + '\n');

    // Build page data with globals
    pageData = extend({}, this.data);

    // Add any data from stream plugins
    pageData = (file.data) ? extend(pageData, file.data) : pageData;

    // Add this page's front matter
    pageData = extend(pageData, page.attributes);

    //apply site.yml
    let pageName = path.relative(this.options.root, file.path).replace(path.extname(file.path), '').split(path.sep).join("_");

    //console.log(`RENDER ${pageName} at ${pageData.url}`);
    if (pageData.url) {
      if (pageData.url === "/") {
        file.path = path.join(
          process.cwd(), 
          this.options.root, "index.html");
      } else {
        file.path = path.join(
          process.cwd(), 
          this.options.root, 
          ...pageData.url.split('/')
        ) + "/index.html";
      }
    } else {
      pageData.url = path.join(this.options.root, path.basename(file.path)).replace(path.delimiter, '/');
    }

    if (pageData.index === undefined) pageData.index = true;

    file.data = extend(file.data || {}, {
      url: pageData.url,
      index: pageData.index
    });

    // Finish by adding constants
    pageData = extend(pageData, {
      page: pageName,
      layout: layout,
      root: processRoot(file.path, this.options.root)
    });

    // Add special ad-hoc partials for #ifpage and #unlesspage
    this.Handlebars.registerHelper('ifpage', require('../builtinHelpers/ifPage')(pageData.page));
    this.Handlebars.registerHelper('unlesspage', require('../builtinHelpers/unlessPage')(pageData.page));

    // Finally, add the page as a partial called "body", and render the layout template
    this.Handlebars.registerPartial('body', pageTemplate);
    file.contents = new Buffer(layoutTemplate(pageData));
  }
  catch (e) {
    console.log('ERROR: ', e);
    if (layoutTemplate) {
      // Layout was parsed properly so we can insert the error message into the body of the layout
      this.Handlebars.registerPartial('body', 'Builder: template could not be parsed <br> \n <pre>{{error}}</pre>');
      file.contents = new Buffer(layoutTemplate({ error: e }));
    }
    else {
      // Not even once - write error directly into the HTML output so the user gets an error
      // Maintain basic html structure to allow Livereloading scripts to be injected properly
      file.contents = new Buffer('<!DOCTYPE html><html><head><title>Builder error</title></head><body><pre>'+e+'</pre></body></html>');
    }

    throw new Error('Builder: rendering error occured.\n' + e);
  }
  finally {
    // This sends the modified file back into the stream
    cb(null, file);
  }
}
