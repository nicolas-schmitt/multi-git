'use strict';

const _ = require('lodash');
const nodegit = require('nodegit');
const Config = require('./config');
const RepoList = require('./repository-list');

module.exports = class MultiGit {
    constructor() {
        this.configLoaded = false;
        this.reposLoaded = false;
    }

    init() {
        return new Promise((resolve) => {
            if (this.configLoaded) {
                resolve(this.config);
            } else {
                Config.load().then((config) => {
                    this.config = config;
                    this.configLoaded = true;
                    resolve(this.config);
                })
                .catch((err) => {
                    console.error(err);
                });
            }
        });
    }

    loadRepositories() {
        return new Promise((resolve) => {
            if (this.reposLoaded) {
                resolve(this);
            } else {
                this.init()
                    .then(() => {
                        return RepoList.load(this.config);
                    })
                    .then((list) => {
                        this.repositories = list;
                        this.reposLoaded = true;
                        resolve(this);
                    })
                    .catch((err) => {
                        console.error(err);
                    });
            }
        });
    }

    status() {
        let proms = _.map(this.repositories, (repository) => {
            repository.status = {};

            return repository.git
                .getStatus()
                .then((pendingChanges) => {
                    repository.status.pendingChanges = pendingChanges;
                })
                .then(() => {
                    return repository.git.getCurrentBranch();
                })
                .then((branch) => {
                    repository.currentBranch = branch;
                    repository.status.branch = branch.shorthand();
                })
                .then((branch) => {
                    return nodegit.Branch.upstream(repository.currentBranch);
                }, (error) => {
                    repository.status.upstream = 'none';
                })
                .then((branch) => {
                    if (branch) {
                        repository.currentUpstream = branch;
                        repository.status.upstream = branch.shorthand();
                        return repository;
                    }
                })
                .then(() => {
                    if (repository.currentBranch && repository.currentUpstream) {
                        return Promise.all([
                            repository.git.getBranchCommit(repository.currentBranch),
                            repository.git.getBranchCommit(repository.currentUpstream),
                        ]);
                    }
                })
                .then((commits) => {
                    if (commits) {
                        return nodegit.Graph.aheadBehind(repository.git, commits[0].id(), commits[1].id());
                    } else {
                        return {
                            ahead: 0,
                            behind: 0
                        };
                    }
                })
                .then((result) => {
                    repository.status.ahead = result.ahead;
                    repository.status.behind = result.behind;
                })
                .then(() => {
                    return repository;
                })
                .catch((error) => {
                    console.error(error);
                });
            });

        return Promise.all(proms);
    }

    fetch() {
        let proms = _(this.repositories)
            .filter((repository) => {
                return _.some(repository.currentUpstream);
            })
            .map((repository) => {
                return repository.git.fetch(repository.currentUpstream)
                    .catch((error) => {
                        console.error(error);
                    });
            });

        return Promise.all(proms);
    }
};
