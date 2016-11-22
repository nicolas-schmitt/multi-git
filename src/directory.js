'use strict';

const _ = require('lodash');
const path = require('path');
const Promise = require('bluebird');
const SimpleGit = require('simple-git');
const os = require('os');

const fs = require('./fs');
const {
    ActiveReleaseError,
    DirtyRepositoryError,
    MultipleActiveReleaseError,
    NoPackageError,
    NoActiveReleaseError,
} = require('./errors');

class Directory {
    constructor() {
        if (arguments.length === 0) {
            this.path = process.cwd();
            this.name = path.basename(this.path);
        } else if (arguments.length === 1 && _.isString(arguments[0])) {
            this.path = this.expandHomeDir(arguments[0]);
            this.name = path.basename(this.path);
        } else if (arguments.length === 1 && _.isObject(arguments[0])) {
            this.path = this.expandHomeDir(arguments[0].path);
            this.name = arguments[0].name || path.basename(this.path);
        }else if (arguments.length === 2) {
            this.path = this.expandHomeDir(arguments[0]);
            this.name = arguments[1];
        }

        this._hasGit = null;
        this.git = null;
        this._config = null;
    }

    expandHomeDir(pathToExpand) {
        if (pathToExpand && pathToExpand[0] === '~') {
            return path.join(process.env.HOME, pathToExpand.slice(1));
        }

        return pathToExpand;
    }

    hasGit() {
        if (this._hasGit === null) {
            return fs.statAsync(path.join(this.path, '.git')).then((stats) => {
                this._hasGit = stats.isDirectory();
                return this._hasGit;
            })
            .catch((error) => {
                this._hasGit = false;
                return this._hasGit;
            });
        } else {
            return Promise.resolve(() => { return this._hasGit; });
        }
    }

    loadGit() {
        this.git = SimpleGit(this.path);
        this.git.silent(true);
        Promise.promisifyAll(this.git);
        this.git.runAsync = Promise.promisify(this.git._run);
    }

    // common git methods

    status() {
        return this.git.statusAsync();
    }

    detailedStatus() {
        return Promise.all([
            this.status(),
            this.getVersion(),
        ])
        .then(([status, version]) => {
            status.version = version;
            status.parent = this;
            status.editCount = 0 +
                status.not_added.length +
                status.deleted.length +
                status.modified.length +
                status.created.length +
                status.renamed.length +
                status.conflicted.length;

            status.text = status.editCount === 0 ? 'clean' : 'dirty';

            return status;
        });
    }

    fetch() {
        return this.git.fetchAsync();
    }

    checkout(what) {
        return this.git.checkoutAsync(what);
    }

    commit(message) {
        return this.git.commitAsync(message);
    }

    branch() {
        return this.git.branchAsync();
    }

    deleteBranch(branchName) {
        return this.git.deleteBranchAsync(branchName);
    }

    createBranch(branchName, startPoint) {
        if (startPoint) {
            return this.git.checkoutBranchAsync(branchName, startPoint);
        } else {
            return this.git.checkoutLocalBranchAsync(branchName);
        }
    }

    push(remoteName, branchName) {
        return this.git.pushAsync(remoteName, branchName);
    }

    pushTags(remoteName) {
        return this.git.pushTagsAsync(remoteName);
    }

    pull(remoteName, branchName, options) {
        return this.git
            .pullAsync(remoteName, branchName, options)
            .then((summary) => {
                summary.parent = this;
                return summary;
            });
    }

    mergeFromTo(from, to, options) {
        return this.git.mergeFromToAsync(from, to, options);
    }

    tag(tagName, tagMessage) {
        return this.git.addAnnotatedTagAsync(tagName, tagMessage);
    }

    addFiles(files) {
        return this.git.addAsync(files);
    }

    reset(options) {
        return this.git.resetAsync(options);
    }

    stash(options) {
        return this.git.stashAsync(options);
    }

    // git flow methods

    config() {
        if (this._config) {
            return Promise.resolve(this.config);
        } else {
            return this.git
                .runAsync(['config', '--list'])
                .then((rawConfig) => {
                    const lines = rawConfig.split(os.EOL);

                    const config = _.reduce(lines, (result, line) => {
                        const [key, value] = line.split('=');
                        _.set(result, key, value);
                        return result;
                    }, {});

                    if (!config.gitflow) {
                        config.gitflow = {
                            branch: {
                                master: 'master',
                                develop: 'develop'
                            },
                            prefix: {
                                feature:'feature/',
                                release:'release/',
                                hotfix:'hotfix/',
                                support:'support/',
                                versiontag:''
                            }
                        };
                    }

                    this._config = config;
                    return this._config;
                });
        }
    }

    getVersion() {
        return Promise.some([
            fs.readFileAsync(path.join(this.path, 'composer.json')),
            fs.readFileAsync(path.join(this.path, 'package.json'))
        ], 1)
        .then((result) => {
            const module = JSON.parse(result.toString());
            return module.version;
        })
        .catch((error) => {
            return '-';
        });
    }

    setVersion(version) {
        return Promise.all([
            this.updatePackageFile('package.json', {version}),
            this.updatePackageFile('composer.json', {version})
        ])
        .then(([presult, cresult]) => {
            if (!presult.success && !cresult.success) {
                if (presult.error.code === 'ENOENT' && cresult.error.code === 'ENOENT') {
                    throw new NoPackageError();
                } else if (presult.error.code === cresult.error.code) {
                    throw presult.error;
                }
            }
        });
    }

    startRelease(name) {
        return Promise
            .all([
                this.config(),
                this.status(),
            ])
            .then(([config, {editCount}]) => {
                if (editCount > 0) {
                    throw new DirtyRepositoryError();
                }

                const branchName = config.gitflow.prefix.release + name;
                const startPoint = config.gitflow.branch.develop;
                return this.createBranch(branchName, startPoint);
            });
    }

    getReleaseBranch() {
        return Promise
            .all([
                this.config(),
                this.branch(),
            ])
            .then(([config, summary]) => {
                const prefix = config.gitflow.prefix.release;
                let branches = _.find(summary.branches, (branch) => {
                    return branch.name.startsWith(prefix);
                });

                if (_.isArray(branches) && _.size(branches) > 1) {
                    throw new MultipleActiveReleaseError();
                } else if (_.isObject(branches)) {
                    return branches;
                }

                const remoteReleaseBranchRegexp = new RegExp('^remotes\\/.+\\/(' + prefix + '.+)$');
                branches = _.find(summary.branches, (branch) => {
                    return remoteReleaseBranchRegexp.test(branch.name);
                });

                if (_.isArray(branches) && _.size(branches) > 1) {
                    throw new MultipleActiveReleaseError();
                } else if (_.isObject(branches)) {
                    branches.isRemote = true;
                    branches.localName = remoteReleaseBranchRegexp.exec(branches.name)[1];
                    return branches;
                } else {
                    throw new NoActiveReleaseError();
                }
            });
    }

    ensureNoActiveRelease() {
        return this.getReleaseBranch()
            .catch((error) => {
                if (error instanceof NoActiveReleaseError) {
                    return true;
                } else {
                    throw error;
                }
            })
            .then((result) => {
                if (!result) {
                    throw new ActiveReleaseError();
                }

                return result;
            });
    }

    publishRelease() {
        return this
            .getReleaseBranch()
            .then((branch) => {
                return this.push('origin', branch.name);
            });
    }

    finishRelease() {
        const scope = {};

        return this
            .config()
            .then((config) => {
                scope.master = scope.config.gitflow.branch.master;
                scope.develop = scope.config.gitflow.branch.develop;
            })
            .getReleaseBranch()
            .then((branch) => {
                scope.release = branch.name;
                if (!branch.curent) {
                    if (branch.isRemote) {
                        scope.release = branch.localName;
                    }

                    return this.checkout(scope.release);
                }
            })
            .then(() => {
                return this.pull('origin', scope.release);
            })
            .then(() => {
                return this.checkout('origin', scope.master);
            })
            .then(() => {
                return this.pull('origin', scope.master);
            })
            .then(() => {
                return this.mergeFromTo(scope.release, scope.master);
            })
            .then(() => {
                return this.tag(scope.version, 'Finish ' + scope.version);
            })
            .then(() => {
                return this.checkout('origin', scope.develop);
            })
            .then(() => {
                return this.pull('origin', scope.develop);
            })
            .then(() => {
                return this.mergeFromTo(scope.version, scope.develop);
            });
    }

    pushAllDefaults() {
        return this
            .config()
            .then((config) => {
                return _.values(config.gitflow.branch);
            })
            .then((branches) => {
                return Promise.map(branches, (branch) => {
                    return this
                        .checkout(branch)
                        .then(() => {
                            return this.push('origin', branch);
                        });
                });
            })
            .then(() => {
                return this.pushTags('origin');
            });
    }

    // helpers

    updatePackageFile(fileName, patch) {
        const packagePath = path.join(this.path, fileName);
        return fs
            .readFileAsync(packagePath)
            .then((content) => {
                const packageContent = JSON.parse(content.toString());
                _.merge(packageContent, patch);
                return fs.writeFileAsync(packagePath, JSON.stringify(packageContent, null, 2));
            })
            .then(() => {
                return {success: true};
            })
            .catch((error) => {
                return {error};
            });
    }
}

module.exports = Directory;
