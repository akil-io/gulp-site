var builder;

/**
 * Initializes an instance of Builder.
 * @constructor
 * @param {object} options - Configuration options to use.
 */
function Builder(options) {
  this.options = options;
  this.Handlebars = require('handlebars');
  this.layouts = {};
  this.data = {};

  if (!options.layouts) {
    throw new Error('Builder error: you must specify a directory for layouts.');
  }

  if (!options.root) {
    throw new Error('Builder error: you must specify the root folder that pages live in.')
  }
}

Builder.prototype.refresh = require('./lib/refresh');
Builder.prototype.loadLayouts = require('./lib/loadLayouts');
Builder.prototype.loadPartials = require('./lib/loadPartials');
Builder.prototype.loadHelpers = require('./lib/loadHelpers');
Builder.prototype.loadData = require('./lib/loadData');
Builder.prototype.render = require('./lib/render');

/**
 * Gulp stream function that renders HTML pages. The first time the function is invoked in the stream, a new instance of Builder is created with the given options.
 * @param {object} options - Configuration options to pass to the new Builder instance.
 * @returns {function} Transform stream function that renders HTML pages.
 */
module.exports = function(options) {
  if (!builder) {
    builder = new Builder(options);
    builder.refresh();
    module.exports.refresh = builder.refresh.bind(builder);
  }

  // Compile pages with the above helpers
  return builder.render();
}

module.exports.Builder = Builder;
module.exports.refresh = function() {}
