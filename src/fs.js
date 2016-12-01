import {promisify} from 'bluebird';
import fs from 'fs';
import path from 'path';

fs.statAsync = fs.statAsync || promisify(fs.stat);
fs.readFileAsync = fs.readFileAsync || promisify(fs.readFile);
fs.writeFileAsync = fs.writeFileAsync || promisify(fs.writeFile);
fs.readdirAsync = fs.readdirAsync || promisify(fs.readdir);
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
