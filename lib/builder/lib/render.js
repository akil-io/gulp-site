const extend = require('deepmerge');
const fm = require('front-matter');
const path = require('path');
const through = require('through2');
const File = require('vinyl');
const stripBom = require('strip-bom');
const processRoot = require('./processRoot');
const yaml  = require('js-yaml');
const util = require('../../util');

const Page = require('../page');

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

function queryData(root, query) {
  let querySteps = query.split('.');
  let currentLevel = root;
  let result = [];
  let level = 0;

  for (let step of querySteps) {
    level++;
    if (step.indexOf('*') != -1) {
      for (let key in currentLevel) {
        let tpl = new RegExp('^'+step.replaceAll('*', '[\\w\\d\_\-]+')+'$');
        if (tpl.test(key)) {
          if (level == querySteps.length) {
            result.push(currentLevel[key]);
          } else {
            result.push(...queryData(currentLevel[key], querySteps.slice(level).join('.')));
          }
        }
      }
    } else {
      currentLevel = currentLevel[step];
    }
  }

  return result;
}

module.exports = function() {
  let self = this;
  return through.obj(function (file, enc, next) {
    render.call(self, file, enc, next, this);
  });
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
function render(file, enc, cb, stream) {
  let page, layoutTemplate, basePath, pageTemplate;
  try {
    util.log('render: ', path.relative(this.options.root, file.path));
    // Get the HTML and DATA for the current page
    page = Page.fromRender(this, file);

    // Get layout template
    layoutTemplate = this.layouts[page.layout];

    if (!layoutTemplate) {
      if (layout === 'default') {
        throw new Error('Builder error: you must have a layout named "default".');
      }
      else {
        throw new Error('Builder error: no layout named "'+layout+'" exists.');
      }
    }

    // Compile page body
    pageTemplate = this.Handlebars.compile(page.body + '\n');

    // Add special ad-hoc partials for #ifpage and #unlesspage
    this.Handlebars.registerHelper('ifpage', require('../builtinHelpers/ifPage')(page.name));
    this.Handlebars.registerHelper('unlesspage', require('../builtinHelpers/unlessPage')(page.name));

    // Finally, add the page as a partial called "body", and render the layout template
    this.Handlebars.registerPartial('body', pageTemplate);

    if (page.data.template) {
      let pages = queryData(this.data, page.data.template.dataSource);
      for (let pageItemData of pages) {
        if (pageItemData.url == undefined) continue;
        let { pagePath, pageUrl } = page.getPathFromUrl(pageItemData.url);
        util.log(' + virtual: ', pageUrl);

        let pageData = Object.assign({}, page.data, {
          url: pageUrl,
          title: pageItemData.title || page.data.title,
          seoTitle: pageItemData.seoTitle || page.data.seoTitle,
          description: pageItemData.description || page.data.description,
          keywords: pageItemData.keywords || page.data.keywords,
          name: pageItemData.name || page.data.name,
          breadcrumb: pageItemData.breadcrumb || page.data.breadcrumb
        }, {
          [page.data.template.dataName]: pageItemData
        });

        let virtualPage = new File({
          base: file.base,
          data: extend(file.data || {}, {
            url: pageUrl,
            index: page.data.index
          }),
          stat: {
            mtime: file.stat.mtime
          },
          path: pagePath,
          contents: new Buffer(layoutTemplate(pageData))
        });

        stream.push(virtualPage);
      }
    } else {
      file.data = extend(file.data || {}, {
        url: page.data.url,
        index: page.data.index
      });
      file.path = page.path;
      file.contents = new Buffer(layoutTemplate(page.data));

      stream.push(file);
    }
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
    cb();
  }
}
