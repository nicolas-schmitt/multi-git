'use strict';

const _ = require('lodash');
const fs = require('q-io/fs');
const path = require('path');
const nodegit = require('nodegit');

const MultiGitStatus = require('./multi-git-status');

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
                    repo = {
                        repoPath: repo.repoPath,
                        gitPath: repo.gitPath,
                        name: repo.name
                    };

                    return nodegit.Repository.open(repo.gitPath)
                        .then((repository) => {
                            repo.git = repository;
                            repo.status = new MultiGitStatus(repo);
                            return repo.git.getCurrentBranch();
                        })
                        .catch((err) => {
                            console.error('[Multi-Git] Error getting current branch for', repo.name, err);
                            repo.currentBranch = null;
                            repo.status.branch = 'none';
                        })
                        .then((branch) => {
                            if (branch) {
                                repo.currentBranch = {
                                    name: branch.toString(),
                                    shorthand: branch.shorthand()
                                };
                                repo.status.branch = branch.shorthand();
                                return nodegit.Branch.upstream(branch);
                            }
                        })
                        .catch((err) => {
                            console.error('[Multi-Git] Error getting current upstream for', repo.name, err);
                            repo.currentUpstream = null;
                            repo.status.upstream = 'none';
                        })
                        .then((branch) => {
                            if (branch) {
                                let name = branch.toString();
                                let remote = name.split('/')[2];
                                repo.currentUpstream = {
                                    name: branch.toString(),
                                    shorthand: branch.shorthand(),
                                    remote: remote
                                };
                                repo.status.upstream = branch.shorthand();
                            } else {
                                repo.currentUpstream = null;
                                repo.status.upstream = 'none';
                            }
                        })
                        .then(() => {
                            return repo;
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
