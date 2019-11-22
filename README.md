# Gulp-site

Gulp plugin for all in one static site building. 

Main features:
- generate pages from **sitemap**
- compile pages with **Handlebars** using layouts, partials and external data
- compile and minify styles with **SASS**
- compile and minify scripts with **Webpack**
- generate favicon and minify images
- generate **sitemap.xml** and **robots.txt**

## Installation
We recommend using yarn insted of npm.
```bash
yarn add gulp-site
```
## Usage
First time site generation:
```bash
mkdir my-new-site && cd my-new-site
yarn init
yarn add gulp-site
```
Add to **package.json** scripts section:
```json
"scripts": {
    "setup": "site init && site generate",
    "custom": "site create",
    "start": "site default",
    "build": "site build --production",
    "generate": "site generate",
    "favicon": "site favicon",
    "catalog": "site catalog"
  },
```
And generate site base files and directories:
```bash
yarn setup
yarn start
```
Enjoy.

## Options
You can configure gulp-site builder with **config.yml**
```yaml
# Your project's server will run on localhost:xxxx at this port
PORT: 8000
# Your site production web-root, available in templates, but for dev will be replaced with http://localhost:<port>
ORIGIN: https://test.test

INDEX:
  # Additional disallow paths for generating robots.txt
  disallow:
    - /assets/

# Autoprefixer will make sure your CSS works with these browsers
COMPATIBILITY:
  - "last 2 versions"
  - "ie >= 9"
  - "ios >= 7"
  - "android >= 4.4"

# Settings for UnCSS
UNCSS:
  enabled: true # false by default, has known UNCSS bug with js execution
  ignore:
    - !!js/regexp ^\.is-.*

# Include this styles and scripts in all pages
CDN:
  root: https://cdn.mysite.com/ # will set this to {{cdn}} variable with production build
  js:
    - <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/core.js" integrity="sha256-36hEPcG8mKookfvUVvEqRkpdYV1unP6wvxIqbgdeVhk=" crossorigin="anonymous"></script>
  css:
    - <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.7.5/css/bulma.min.css" integrity="sha256-vK3UTo/8wHbaUn+dTQD0X6dzidqc5l7gczvH+Bnowwk=" crossorigin="anonymous" />

# All path must be relative to your working dir
PATHS:
  dist: dist # destination path
  logo: src/assets/img/logo.png # at least 260x260px image or svg for favicon generation
  sitemap: src/sitemap.yml # source file for generating site pages
  pages: src/pages # site pages in .html, .json or .yaml files
  layouts: src/layouts # .html, .hbs or .handlebars layouts
	partials: src/partials # .html, .hbs or .handlebars partials
	public: src/public # this files will be copied to the root of destination
	assets: src/assets # images, styles, scripts and other required files
    data: src/data # .json, .yaml files containing data for templates
    helpers: src/helpers # .js files with helpers
    sass: [] # this paths will be available for import in your scss files
    entries: ['/js/app.js'] # scripts entry files
    styles: ['/scss/app.scss'] # styles entry files
```
All configuration options you can see in settings.js file in module folder.


## Building blocks
### Pages
Page can be defined with .html, .yml or .json file. HTML files can contain YAML Front Matter:
```html
---
layout: default
url: /contact
title: Contact page
index: true
---
<h1>Contact page</h1>
```
In YAML format this will look as:
```yaml
layout: default
url: /contact
title: Contact page
index: true
body: <h1>Contact page</h1>
```
In .yml and .json files you can define body as map of partials, where key is partial name and value data passed to partial exclusively:
```json
{
	"layout": "default",
	"url": "/contact",
	"title": "Contact page",
	"index": true,
	"body": {
		"widget_map": {
			"link": "<link to my map>"
		},
		"feedback_form": {
			"title": "Contact us!"
		}
	}
}
```
This body will be generated in template like this:
```html
{{#with body.widget_map}}
	{{> widget_map}}
{{/with}}
{{#with body.feedback_form}}
	{{> feedback_form}}
{{/with}}
```
#### Page attributes
**layout:** &mdash; name of the layout file used for this page
**url:** &mdash; page will be available by this url, for example /contact will create file at contact/index.html
**title:** &mdash; page head title, in the default layout placed in `<title>{{title}}</title>`
**description:** &mdash; page head description tag
**keywords:** &mdash; page head keywords tag
**index:** &mdash; boolean type, declare page indexation, indexed page (index: true) will be available in `sitemap.xml` with date of last file changing. Not indexed page (index: false) will de dissallowed in `robots.txt`
**og:** &mdash; open graph data, used in `meta.html` partial provided by gulp-site. Read about it in partials.
**cdn:** &mdash; contain js and css array properties with scripts and styles available only on this page

### `layouts`
Layout files can have the extension `.html`, `.hbs`, or `.handlebars`. Default layout provided:
```html
{{#wrap 'html5' this}}
  {{> body}}
{{/wrap}}
```

You can customise layout by calling next command:
```bash
yarn custom layout:default
```
And default layout will be copied to the `src/layouts/default.html`
All layouts have a special Handlebars partial called `body` which contains the contents of the page.

```html
<!-- Header up here -->
{{> body}}
<!-- Footer down here -->
```

### `partials`
Partial files can have the extension `.html`, `.hbs`, or `.handlebars`. Each will be registered as a Handlebars partial which can be accessed using the name of the file. (The path to the file doesn't matter&mdash;only the name of the file itself is used.)

```html
<!-- Renders partials/header.html -->
{{> header}}
```

Gulp-site provide partial {{> meta}} for meta tags generation:
```html
<meta name="description" content="{{description}}" />
<meta name="keywords" content="{{keywords}}" />
<link rel="canonical" href="{{site.domain}}{{url}}"/>

<link rel='shortcut icon' type='image/x-icon' href='/favicon.ico'>
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="manifest" href="/site.webmanifest">

{{#if theme}}
<link rel="mask-icon" href="/safari-pinned-tab.svg" color="{{theme.safari_tab_color}}">
<meta name="msapplication-TileColor" content="{{theme.msapp_color}}">
<meta name="theme-color" content="{{theme.color}}">
{{/if}}

{{#if og}}
<meta property="og:type" content="{{#if og.type}}{{og.type}}{{else}}website{{/if}}" />
<meta property="og:site_name" content="{{og.site_name}}" />
<meta property="og:image:width" content="{{#if og.image_width}}{{og.image_width}}{{else}}795{{/if}}">
<meta property="og:image:height" content="{{#if og.image_wheight}}{{og.image_height}}{{else}}200{{/if}}">
<meta property="og:url" content="{{settings.origin}}">
<meta property="og:image" content="{{settings.origin}}/{{og.image}}">
<meta property="og:title" content="{{#if og.image_width}}{{og.title}}{{else}}{{title}}{{/if}}">
<meta property="og:description" content="{{#if og.image_width}}{{og.description}}{{else}}{{description}}{{/if}}">
{{/if}}

{{#unless index}}
<meta name="robots" content="noindex, nofollow"/>
{{/unless}}
```

#### `partial: wrapper`
Is a special type of partials for wrapping around your code.
For example `html5` wrapper is contain next code:
```html
<!doctype html>
<html class="no-js" lang="{{site.language}}">
  <head>
    {{#if site.tagID}}
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0], j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src= 'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f); })(window,document,'script','dataLayer','{{site.tagID}}');</script> <!-- End Google Tag Manager -->
    {{/if}}
    
    {{> meta}}
    
    {{#if css}}
      {{#each css}}
    {{{this}}}
      {{/each}}
    {{/if}}

    <link rel="stylesheet" href="{{cdn}}css/app.css?{{timestamp}}">
  </head>
<body>
  {{#if site.tagID}}
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id={{site.tagID}}"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
  {{/if}}
  
  {{{child}}}

  {{#if js}}
    {{#each js}}
  {{{this}}}
    {{/each}}
  {{/if}}
  <script src="{{cdn}}js/app.js?{{timestamp}}"></script>
</body>
</html>
```
Is is like a layout, but replace `{{> body}}` with `{{{child}}}` tag.
```html
<!-- Wrapper start up here -->
{{{child}}}
<!-- Wrapper end down here -->
```

### `helpers`
Handlebars helpers are `.js` files which export a function via `module.exports`. The name used to register the helper is the same as the name of the file.

For example, a file named `content.js` that exports this function would add a Handlebars helper called `{{content}}`.

```js
module.exports = function(text, options) {
  return `<p>${text}</p>`
}
```
Argument options contain all data, or **fn** function with child elements with helper block call:
```html
{{#content}}
    <b>Hello</b>
{{/content}}
```
And **content.js** will be:
```js
module.exports = function(text, options) {
  return '<p>' + options.fn(options.data.root) + '</p>';
}
```
In **this** context available Handlebars property if you need listing of partials or call .compile function.

Provided default next helpers:
**{{#code 'html'}} ... {{/code}}** &mdash; highlight code examples with selected language using `highlight.js`
**{{getData 'site.tagID'}}** &mdash; get data by path from the root
**{{getPage 'contact'}}** &mdash; return page object with all data
**{{getPage 'contact' 'body.feedback_form'}}** &mdash; return data from selected page by path
**{{ifEqual 'a' 'b'}} ... {{else}} ... {{/ifEqual}}** &mdash; if the values are equal, content inside of the helper. If not, the content inside the `{{else}}` block
**{{#markdown}} ... {{/markdown}}** &mdash; render markdown formated text to html
**{{repeat 3}} ... {{/repeat}}** &mdash; repeate n times content inside of the helper
**{{#wrap 'partial_name'}} ... {{/wrap}}** &mdash; use selected partial for wraping content inside tags. Partial used in wrap must contain `{{{child}}}` tag, rendered in root context.
**{{#wrap 'partial_name' withData}} ... {{/wrap}}** &mdash; Partial used in wrap rendered in `withData` context., if withData not set used global context. For current context set `this`.

### `data`
Data can be formatted as JSON (`.json`) or YAML (`.yml`). Within a template, the data is stored within a variable with the same name as the file it came from.

For example, a file named `contact.json` with key/value pairs such as the following:

```js
{
    "name": "John Doe",
    "email": "john.doe@gmail.com",
    "phone": "555-1212"
}
```

Could be used to output the value of John Doe within a template using the Handlebars syntax of `{{contact.name}}`.

Data can also be inserted into the page itself with a Front Matter template at the top of the .html file or defined in .yml or .json fields of page file.

Lastly, the reserved `page` variable is added to every page template as it renders. It contains the name of the page being rendered, without the extension.

When generating initial setup will be provided `site.yml` file:
```yaml
name: new site
tagID: 

about: short description
description: full description

contact:
  phone:
  email:
  time:
```

Property `tagID` used for Google Tag Manager code placement in the default layout provided by gulp-site.

#### `data catalog`
Site data can be readed from /data/<catalog-name>/index.{yml,json,js} files. This files can be filled manual or generated by command `yarn catalog --name <catalog-name>`. This command output catalog data file with directory tree of this catalog.

By default output will be looked like this:
```yaml
items:
  folder1:
    images:
      - url: /folder1/1.jpg
        preview: /folder1/1@s.jpg
    videos: []
  folder2:
    items:
      subfolder1:
        images:
          - url: /folder2/subfolder1/1.jpg
            preview: /folder2/subfolder1/1@s.jpg
```

By default catalog generator copy media files to `/src/public/content/<catalog-name>` folder, for images also make a preview with size 120x120px.

You can configure output by add settings.yml file on any level of catalog and this options will be applied to this folder.

**Available options:**
`prefix` - string prepended the folder name in result index.yml file.
`flatItems` - do not place child items in `items` key, each of child will be placed on the folder root level.
`dataTemplate` - object fields appended to result folder object. Work as template with ${keyname} style (warning: filled one by one by declaration order). Available two default variable: `${itemDirName}`, `${parentDirName}`.
`subSettings` - settings applied to the each subfolders. If subfolder has own settings file this one merged with this options, but own subdolder settings has priority.

