'use strict';

const _ = require('lodash');
const nodegit = require('nodegit');
const Config = require('./config');
const RepoList = require('./repository-list');

module.exports = class MultiGit {
    get repositoriesWithValidUpstream() {
        return _.filter(this.repositories, (repository) => {
            return !_.isNil(repository.currentUpstream);
        });
    }

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
                    console.error('[Multi-Git] Error loading configuration file', err);
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
                        console.error('[Multi-Git] Error loading repositories', err);
                    });
            }
        });
    }

    status(repositories) {
        let proms = _.map(repositories || this.repositories, (repository) => {
            return repository.git
                .getStatus()
                .then((pendingChanges) => {
                    repository.status.pendingChanges = pendingChanges;
                    repository.status.text = _.some(repository.status.pendingChanges) ? 'dirty' : 'clean';

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
                    return repository;
                })
                .catch((err) => {
                    console.error('[Multi-Git] Error gettings status for', repository.name, err);
                });
            });

        return Promise.all(proms);
    }

    fetch(repositories) {
        let proms = _.map(
            repositories || this.repositoriesWithValidUpstream,
            (repository) => {
                return repository.git
                    .fetch(repository.currentRemoteName)
                    .then(() => {
                        return repository;
                    })
                    .catch((err) => {
                        console.error('[Multi-Git] Error fetching', repository.name, err);
                    });
            });

        return Promise.all(proms);
    }

    pull(repositories) {
        return this.fetch(repositories)
            .then((result) => {
                return this.status(result);
            })
            .then((result) => {
                let proms = _(result).filter((repository) => {
                        return repository.status.text === 'clean' && repository.status.behind > 0;
                    })
                    .map((repository) => {
                        return repository.git
                            .mergeBranches(repository.currentBranch, repository.currentUpstream)
                            .catch((err) => {
                                console.error('[Multi-Git] Error merging', repository.name, err);
                            });
                    });

                return Promise.all(proms);
            });
    }
};
