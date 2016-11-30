'use strict';

const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');

fs.statAsync = fs.statAsync || Promise.promisify(fs.stat);
fs.readFileAsync = fs.readFileAsync || Promise.promisify(fs.readFile);
fs.writeFileAsync = fs.writeFileAsync || Promise.promisify(fs.writeFile);
fs.readdirAsync = fs.readdirAsync || Promise.promisify(fs.readdir);
fs.expandHomeDir = fs.expandHomeDir || expandHomeDir;

/**
 * Replaces ~ in a given path.
 * @param {string} pathToExpand - The path to expand.
 */
function expandHomeDir(pathToExpand) {
    if (pathToExpand && pathToExpand[0] === '~') {
        return path.join(process.env.HOME, pathToExpand.slice(1));
    }

    return pathToExpand;
}

module.exports = fs;
