'use strict';

const fs = require('q-io/fs');
const path = require('path');

module.exports.load = function load() {
    const configPath = path.resolve('.multigitconfig');

    return fs.exists(configPath)
        .then((configFileExists) => {
            if (configFileExists) {
                return fs.read(configPath)
                    .then((content) => {
                        return JSON.parse(content);
                    });
            } else {
                return {};
            }
        });
};
