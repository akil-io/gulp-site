#!/bin/bash

node ../bin/cli.js init
node ../bin/cli.js generate --force
node ../bin/cli.js create layout:default
node ../bin/cli.js create partial:html5
node ../bin/cli.js create partial:meta
node ../bin/cli.js favicon

mkdir src/data/products
mkdir src/data/products/id_1
cp src/public/mstile-310x310.png src/data/products/id_1/1.png
node ../bin/cli.js catalog --name products

node ../bin/cli.js build --production

rm -rf dist src
rm -f .gitignore config.yml faviconData.json
