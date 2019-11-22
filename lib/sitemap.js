//const gutil = require('gulp-util');
const PluginError  = require('plugin-error');
const through = require('through2');
const File = require('vinyl');
const path = require('path');

module.exports = function(options) {
  let pages = [];
  let origin = options.origin || "http://localhost:8000";
  let disallow = options.disallow || [];

  return through.obj(function(file, enc, cb) {
    // Если файл не существует
    if (file.isNull()) {
      cb(null, file);
      return;
    }

    // Если файл представлен потоком
    if (file.isStream()) {
      cb(new PluginError('gulp-site', 'Streaming not supported'));
      return;
    }

    //console.log('MAP FOR: ', file.path, file.data);

    // Код плагина
    pages.push({
    	path: file.path,
    	mtime: new Date(file.stat.mtime),
      index: file.data.index,
      url: file.data.url
    });

    // Возвращаем обработанный файл для следующего плагина
    this.push(file);
    //console.log('NEXT FILE...\n\n');
    cb();
  }, function (cb) {
  	pages = pages.map(page => Object.assign(page, {
  		url: new URL(page.url, origin),
  		lastMod: page.mtime.toISOString().substr(0,10)
  	}))
    let sitemap = pages.filter(page => page.index).map(page => `\n\t<url>\n\t\t<loc>${page.url}</loc>\n\t\t<lastmod>${page.lastMod}</lastmod>\n\t</url>`).join('\n');
    let sitemapFile = new File();
    sitemapFile.path = path.join(
      process.cwd(),
      "sitemap.xml"
    );
  	sitemapFile.contents = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemap}\n</urlset>`);
  	this.push(sitemapFile);

    if (options.robots) {
      let robotDisallow = [
        ...disallow.map(dis => Object.assign({}, {url: new URL(dis, origin)})),
        ...pages.filter(page => !page.index)
      ].map(page => `Disallow: ${page.url.pathname}`).join("\n");
      let robotsFile = new File();
      robotsFile.path = path.join(
        process.cwd(),
        "robots.txt"
      );
      robotsFile.contents = Buffer.from(`User-agent: *\nSitemap: ${options.origin}/sitemap.xml\n${robotDisallow}\n`);
      this.push(robotsFile);
    }
  	cb();
  });
}