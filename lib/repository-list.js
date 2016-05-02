'use strict';

const _ = require('lodash');
const fs = require('q-io/fs');
const path = require('path');
const nodegit = require('nodegit');

module.exports.load = function load(config) {
    const repositories = _.get(config, 'repositories');

    if (_.isString(repositories)) {
        return parseRepoString(repositories);
    } else if (_.isArray(repositories)) {
        let proms = _.map(repositories, (repository) => {
            if (_.isString(repository)) {
                return parseRepoString(repository);
            } else {
                return null;
            }
        });

        _.pull(proms, null);

        return Promise.all(proms)
            .then((list) => {
                return _(list)
                    .flatten()
                    .filter((repo) => {
                        return repo.isValid;
                    }).value();
            })
            .then((list) => {
                let proms = _.map(list, (repo) => {
                    return nodegit.Repository.open(repo.gitPath)
                        .then((repository) => {
                            return {
                                repoPath: repo.repoPath,
                                gitPath: repo.gitPath,
                                name: repo.name,
                                git: repository
                            };
                        });
                });

                return Promise.all(proms);
            });
    }
};

function parseRepoString(str) {
    if (str.endsWith('/*')) {
        const groupPath = str.substr(0, str.length - 2);
        return fs.list(groupPath)
            .then((fileNames) => {
                let proms = _.map(fileNames, (fileName) => {
                    let repoPath = path.resolve(groupPath, fileName);
                    return checkRepoPath(repoPath);
                });

                _.pull(proms, null);

                return Promise.all(proms);
            });
    } else {
        return checkRepoPath(str);
    }
}

function checkRepoPath(repoPath) {
    const gitPath = path.resolve(repoPath, '.git');
    return fs.exists(gitPath).then((exists) => {
        return {
            isValid: exists,
            repoPath: repoPath,
            gitPath: gitPath,
            name: repoPath.split(path.sep).pop()
        };
    });
}
