'use strict';

const confirm = require('inquirer-confirm');
const path = require('path');
const fs = require('./fs');
const {ConfigFileName} = require('./manager');

class Valet {
    static helpInstall() {
        const configFilePath = fs.expandHomeDir(path.join('~', ConfigFileName));
        return fs.statAsync(configFilePath)
            .catch((error) => {
                if (error.code === 'ENOENT') {
                    return confirm('No configuration file found. Do you want to create one ?');
                } else {
                    throw error;
                }
            })
            .then((result) => {
                fs.createReadStream(path.join(__dirname, '../', ConfigFileName))
                .pipe(fs.createWriteStream(configFilePath));
            })
            .catch((error) => {
                if (typeof error !== 'undefined') {
                    throw error;
                }
            })
            .done();
    }
}

module.exports = Valet;
