import _ from 'lodash';
import os from 'os';
import path from 'path';
import Promise from 'bluebird';
import SimpleGit from 'simple-git';

import fs from './fs';
import {
    ActiveReleaseError,
    DirtyRepositoryError,
    MultipleActiveReleaseError,
    NoPackageError,
    NoActiveReleaseError,
} from './errors';

/**
 * Represents a directory.
 * @constructor
 * @param {string|object} path - either a directory path or a config object.
 */
export default class Directory {
    constructor() {
        if (arguments.length === 0) {
            this.path = process.cwd();
            this.name = path.basename(this.path);
        } else if (arguments.length === 1 && _.isString(arguments[0])) {
            this.path = fs.expandHomeDir(arguments[0]);
            this.name = path.basename(this.path);
        } else if (arguments.length === 1 && _.isObject(arguments[0])) {
            this.path = fs.expandHomeDir(arguments[0].path);
            this.name = arguments[0].name || path.basename(this.path);
        }else if (arguments.length === 2) {
            this.path = fs.expandHomeDir(arguments[0]);
            this.name = arguments[1];
        }

        this._hasGit = null;
        this.git = null;
        this._config = null;
    }

    /**
     * Checks whether or not the current directory is a git repository
     * @return {Promise}
     */
    hasGit() {
        if (this._hasGit === null) {
            return fs.statAsync(path.join(this.path, '.git')).then((stats) => {
                this._hasGit = stats.isDirectory();
                return this._hasGit;
            })
            .catch(() => {
                this._hasGit = false;
                return this._hasGit;
            });
        } else {
            return Promise.resolve(() => { return this._hasGit; });
        }
    }


    /**
     * Initializes local git client.
     */
    loadGit() {
        this.git = SimpleGit(this.path);
        this.git.silent(true);
        Promise.promisifyAll(this.git);
        this.git.runAsync = Promise.promisify(this.git._run);
    }

    // common git methods

    /**
     * Runs git status
     * @return {Promise}
     */
    status() {
        return this.git.statusAsync();
    }

    /**
     * Runs both git status & this.getVersion(),
     * merges the result
     * @return {Promise}
     */
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

    /**
     * Runs git fetch
     * @return {Promise}
     */
    fetch() {
        return this.git.fetchAsync();
    }

    /**
     * Runs git checkout
     * @param {string} what - what to checkout
     * @return {Promise}
     */
    checkout(what) {
        return this.git.checkoutAsync(what);
    }

    /**
     * Runs git commit
     * @param {string} messgae - the commit message
     * @return {Promise}
     */
    commit(message) {
        return this.git.commitAsync(message);
    }

    /**
     * Runs git branch
     * @return {Promise}
     */
    branch() {
        return this.git.branchAsync();
    }

    /**
     * Runs git branch -d
     * @param {string} branchName - the name of the branch to delete
     * @return {Promise}
     */
    deleteBranch(branchName) {
        return this.git.deleteBranchAsync(branchName);
    }

    /**
     * Runs git branch
     * @param {string} branchName - the name of the branch to create
     * @param {string} startPoint - the branch starting point
     * @return {Promise}
     */
    createBranch(branchName, startPoint) {
        if (startPoint) {
            return this.git.checkoutBranchAsync(branchName, startPoint);
        } else {
            return this.git.checkoutLocalBranchAsync(branchName);
        }
    }

    /**
     * Runs git push
     * @param {string} remoteName - the remote name to push to
     * @param {string} branchName - the branch name to push
     * @return {Promise}
     */
    push(remoteName, branchName) {
        return this.git.pushAsync(remoteName, branchName);
    }

    /**
     * Runs git push
     * @param {string} remoteName - the remote name to push to
     * @return {Promise}
     */
    pushTags(remoteName) {
        return this.git.pushTagsAsync(remoteName);
    }

    /**
     * Runs git pull
     * @param {string} remoteName - the remote name to pull from
     * @param {string} branchName - the branch name to pull
     * @param {array} options - a string array of git pull options
     * @return {Promise}
     */
    pull(remoteName, branchName, options) {
        return this.git
            .pullAsync(remoteName, branchName, options)
            .then((summary) => {
                summary.parent = this;
                return summary;
            });
    }

    /**
     * Runs git merge
     * @param {string} from - where to merge from (commit hash, branch name)
     * @param {string} to - where to merge to (commit hash, branch name)
     * @param {array} options - a string array of git merge options
     * @return {Promise}
     */
    mergeFromTo(from, to, options) {
        return this.git.mergeFromToAsync(from, to, options);
    }

    /**
     * Creates a tag
     * @param {string} tagName - the tag name
     * @param {string} tagMessage - the tag message
     * @return {Promise}
     */
    tag(tagName, tagMessage) {
        return this.git.addAnnotatedTagAsync(tagName, tagMessage);
    }

    /**
     * Stages files
     * @param {array} files - the files to stage
     * @return {Promise}
     */
    addFiles(files) {
        return this.git.addAsync(files);
    }

    /**
     * Resets the repository
     * @param {array} options - array of options supported by the git reset command
     * @return {Promise}
     */
    reset(options) {
        return this.git.resetAsync(options);
    }

    /**
     * Stash the working directory
     * @param {array} options - array of options supported by the git stash command
     * @return {Promise}
     */
    stash(options) {
        return this.git.stashAsync(options);
    }

    // git flow methods

    /**
     * Gets the git configuration for the current directory
     * @return {Promise}
     */
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

    /**
     * Gets the version from either bower.json, composer.json or package.json
     * @return {Promise}
     */
    getVersion() {
        return Promise.some([
            fs.readFileAsync(path.join(this.path, 'bower.json')),
            fs.readFileAsync(path.join(this.path, 'composer.json')),
            fs.readFileAsync(path.join(this.path, 'package.json'))
        ], 1)
        .then((result) => {
            const module = JSON.parse(result.toString());
            return module.version;
        })
        .catch(() => {
            return '-';
        });
    }

    /**
     * Sets the version in bower.json, composer.json and package.json
     * (provided they exist in the first place)
     * @return {Promise}
     */
    setVersion(version) {
        return Promise.all([
            this.updatePackageFile('bower.json', {version}),
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

    /**
     * [git flow] Starts a new release
     * @return {Promise}
     */
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

    /**
     * [git flow] Gets the current release branch
     * @return {Promise}
     */
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

    /**
     * [git flow] Ensures there is no active release
     * @return {Promise}
     */
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

    /**
     * [git flow] Publishes the current release
     * @return {Promise}
     */
    publishRelease() {
        return this
            .getReleaseBranch()
            .then((branch) => {
                return this.push('origin', branch.name);
            });
    }

    /**
     * [git flow] Finishes the current release
     * @return {Promise}
     */
    finishRelease() {
        const scope = {};

        return this
            .config()
            .then(() => {
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

    /**
     * [git flow] Pushes master, develop & tags to origin
     * @return {Promise}
     */
    pushAllDefaults() {
        return this
            .config()
            .then((config) => {
                const branches = _.values(config.gitflow.branch);

                return Promise.map(branches, (branch) => {
                    return this
                        .checkout(branch)
                        .then(() => {
                            const remote = _.get(config, ['branch', branch, 'remote'], 'origin');
                            return this.push(remote, branch);
                        });
                });
            })
            .then(() => {
                return this.pushTags('origin');
            });
    }

    // helpers

    /**
     * [git flow] Runs _.merge between a json file content a js object
     * @param {string} filename - the name of the file to update
     * @param {object} patch - what to update
     * @return {Promise}
     */
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