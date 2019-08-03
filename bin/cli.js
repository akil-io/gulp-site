#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const yargs = require('yargs');
const util = require('../lib/util');

const APP_ROOT = process.cwd();
const MODULE_ROOT = path.resolve(path.dirname(__filename), '../');

//console.log('CWD: ', APP_ROOT);
//console.log('MODULE: ', MODULE_ROOT);

let [ task ] = yargs.argv._ || 'default';
let { production } = yargs.argv;

let gulpFile = path.join(APP_ROOT, 'gulpfile.js');
if (!fs.existsSync(gulpFile)) {
	gulpFile = path.join(MODULE_ROOT, 'gulpfile.js');
}
util.log('Use config from ' + path.relative(APP_ROOT, gulpFile));

let gulp = require(gulpFile);

if (gulp[task] === undefined) {
	util.error(`Error: Task not found in ${gulpFile}`);
	process.exit();
}

gulp[task](function () {
	process.exit();
});
