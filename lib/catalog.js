const path = require('path');

const fs = require('fs-extra');
const yaml = require('js-yaml');
const sharp = require('sharp');
const _ = require('lodash');
const util = require('./util');
const yargs = require('yargs');

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

module.exports = function generator(options) {
	let catalogName = yargs.argv.name;

	const config = {
		name: catalogName,
		isCheckOnly: !!yargs.argv.check,
		isDataOnly: !!yargs.argv.data,
		source: path.resolve(`./${options.data}/${catalogName}`),
		target: path.resolve(`./${options.public}/content/`),
		types: {
			data: ['yml'],
			images: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'svg'],
			videos: ['mp4']
		}
	};

	return function (done) {
		(async function catalog(options) {
			util.log(`Read from: ${config.source}; Write to: ${config.target}`);
		//0. Check inputs
			try {
				let source = await fs.stat(config.source);
				if (!source.isDirectory()) throw Error('Source is not directory');
			} catch (err) {
				if (!source) throw Error('Source not found');
			}
			try {
				await fs.access(config.source, fs.constants.R_OK)
			} catch (err) {
				throw Error('Source is not readable');
			}
			try {
				await fs.access(config.source, fs.constants.W_OK)
			} catch (err) {
				throw Error('Source is not writable');
			}

			try {
				let target = await fs.stat(config.target);
				if (!target.isDirectory()) throw Error('Target is not directory');
			} catch (err) {
				await fs.ensureDir(config.target);
			}
			try {
				await fs.access(config.target, fs.constants.W_OK)
			} catch (err) {
				throw Error('Target is not writable');
			}

			if (config.isCheckOnly) {
				return `Catalog ${catalogName} ready.`;
			}

		//1. Read directory tree
			const getTree = async function (dir, types) {
				let isTypedFiles = _.isPlainObject(types);
				let accepted = isTypedFiles ? [].concat(...Object.values(types)) : types;
				let files = await fs.readdir(dir);

				let data = {};

				for (let item of files) {
					let itemPath = path.join(dir, item);
					let itemStat = await fs.stat(itemPath);

					if (itemStat.isDirectory()) {
						if (!data['folders']) data.folders = {};
						
						data.folders[item] = await getTree(itemPath, types);
					} else {
						let extType = path.extname(item).slice(1).toLowerCase();
						if (accepted.indexOf(extType) != -1) {
							if (isTypedFiles) {
								for (let typeName of Object.keys(types)) {
									if (types[typeName].indexOf(extType) != -1) {
										if (!data[typeName]) data[typeName] = [];
										data[typeName].push(item);
										break;
									}
								}
							} else {
								if (!data['files']) data.files = [];
								data.files.push(item);
							}
						}
					}
				}

				return data;
			};

			let files = await getTree(config.source, config.types);
			await fs.writeFile(path.join(config.source, '__tree.yml'), yaml.dump(files));

		//2. Build output data structure | plan convertion tasks
			const buildData = async function (root, tree, dest, inheritedSettings = {}) {
				let customData = {};
				let customSettings = {};
				let settings = {
					parentName: null,
					itemName: null,
					root: root,
					flatItems: true,
					prefix: '',
					subSettings: {},
					filesFolder: '',
					filesPrefix: false,
					dataTemplate: {}
				};
				const isCategory = t => (t['folders'] != undefined) && (Object.keys(t['folders']).length > 0);
				const generateData = (template, data, builtin = {}) => {
					let result = Object.assign({}, template, data);
					for (let key in result) {
						let currentValue = result[key];
						currentValue = currentValue.replaceAll('${parentDirName}', builtin.parentDirName);
						currentValue = currentValue.replaceAll('${itemDirName}', builtin.itemDirName);

						for (let search in result) {
							if (search == key) continue;
							currentValue = currentValue.replaceAll('${'+search+'}', result[search]);
						}
						result[key] = currentValue.trim();
					}
					return result;
				}

				if (tree.data) {
					if (tree.data.indexOf('settings.yml') != -1) {
						customSettings = yaml.load(await fs.readFile(path.join(root, 'settings.yml')));
					}
				}
				settings = _.defaultsDeep({}, customSettings, inheritedSettings, settings);
				if (settings.data) {
					customData = Object.assign({}, settings.data);
				}

				let data = [customData];
				let tasks = [];
				let generatedData = settings.dataTemplate ? generateData(settings.dataTemplate, customData, {
					itemDirName: settings.itemName,
					parentDirName: settings.parentName
				}) : {};
				data.push({ ...generatedData });

				if (isCategory(tree)) {
					let items = {};

					for (let folderName in tree.folders) {
						let targetFolderName = [settings.prefix, folderName].join("");

						let {data: folderData, tasks: folderTasks} = await buildData(
							path.join(root, folderName),
							tree.folders[folderName],
							path.join(dest, folderName),
							Object.assign({}, settings.subSettings, {
								root: settings.root,
								parentName: settings.itemName,
								itemName: folderName,
								filesFolder: [settings.filesFolder, folderName].join('/')
							})
						);

						items[targetFolderName] = Object.assign({}, folderData);
						tasks = [...tasks, ...folderTasks];
					}

					if (settings.flatItems) {
						data.push({ ...items });
					} else {
						data.push({ items });
					}
				} else {
					let nameIndex = 1;
					let images = [];
					let videos = [];

					if (tree.images) for (let imageItem of tree.images) {
						let extType = path.extname(imageItem).slice(1).toLowerCase();
						if (extType == 'jpeg') extType = 'jpg';

						let targetName = `${nameIndex}.${extType}`;
						let previewName = `${nameIndex}@s.${extType}`;
						nameIndex++;
						let task = {
							type: 'image',
							resize: Object.assign({}, {
								width: 120,
								height: 120,
								fit: 'cover',
								position: 'center'
							}, settings.resize || {}),
							source: path.relative(settings.root, path.join(root, imageItem)),
							copy: path.relative(settings.root, path.join(dest, targetName)),
							preview: path.relative(settings.root, path.join(dest, previewName))
						};

						if (settings.filesPrefix) {
							targetName = `${settings.filesPrefix}${targetName}`;
							previewName = `${settings.filesPrefix}${previewName}`;
						}

						if (settings.filesFolder) {
							targetName = [settings.filesFolder, targetName].join('/');
							previewName = [settings.filesFolder, previewName].join('/');
						}

						images.push({
							url: targetName,
							preview: previewName
						});
						tasks.push(task);
					}

					if (tree.videos) for (let videoItem of tree.videos) {
						let extType = path.extname(videoItem).slice(1).toLowerCase();
						if (extType == 'jpeg') extType = 'jpg';

						let targetName = `${nameIndex}.${extType}`;
						//let previewName = `${nameIndex}@small.${extType}`;
						nameIndex++;
						let task = {
							type: 'video',
							source: path.relative(settings.root, path.join(root, videoItem)),
							copy: path.relative(settings.root, path.join(dest, videoItem)),
							preview: null
						};

						videos.push({
							url: targetName
						});
						tasks.push(task);
					}

					data.push({ images, videos, ...generatedData });
				}

				
				data = _.defaultsDeep({}, ...data);

				return {
					data,
					tasks
				};
			};

			let {data, tasks} = await buildData(config.source, files, path.join(config.target, config.name));
			await fs.writeFile(path.join(config.source, 'index.yml'), yaml.dump(data));
			await fs.writeFile(path.join(config.source, '__tasks.yml'), yaml.dump(tasks));
		//3. Converting images, copy content to destination
			if (config.isDataOnly) {
				return "Data generation complete. Resource processing skipped.";
			}

			await fs.ensureDir(path.join(config.target, config.name));
			for (let taskItem of tasks) {
				let sourcePath = path.join(config.source, taskItem.source);
				let targetFolder = path.resolve(config.source, path.dirname(taskItem.copy));
				let copyName = path.basename(taskItem.copy);
				let previewName = taskItem.preview ? path.basename(taskItem.preview) : null;

				await fs.ensureDir(targetFolder);
				//copy
				if (copyName) {
					await fs.copy(sourcePath, path.join(targetFolder, copyName));
				}
				if (taskItem.type == 'image' && previewName) {
					//preview
					let image = sharp(sourcePath);
					let meta = await image.metadata();
					let orientation = (meta.width >= meta.height) ? 'landscape' : 'portrait';
					//let resizeOptions = (orientation == "landscape") ? { height: 120 } : { width: 120 };
					//console.log(`${taskItem.source}: ${meta.width}x${meta.height} (${orientation})`);

					await image.resize(taskItem.resize).toFile(path.join(targetFolder, previewName));
				}
			}

			return "Data generation complete. Resource processed.";
		})()
			.then(result => {
				util.log(`Result: ${result}`)
				done();
			})
			.catch(err => {
				util.log(err);
				done();
			});
	}
}