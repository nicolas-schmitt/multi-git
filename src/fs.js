'use strict';

const fs = require('fs');
const Promise = require('bluebird');

if (!fs.statAsync) {
    fs.statAsync = Promise.promisify(fs.stat);
    fs.readFileAsync = Promise.promisify(fs.readFile);
    fs.writeFileAsync = Promise.promisify(fs.writeFile);
    fs.readdirAsync = Promise.promisify(fs.readdir);
}

module.exports = fs;
