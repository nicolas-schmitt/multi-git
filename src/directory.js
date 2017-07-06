import _ from 'lodash';
import os from 'os';
import path from 'path';
import Promise from 'bluebird';
import SimpleGit from 'simple-git';

import fs from './fs';
import {
    ActiveReleaseError,
    AheadRepositoryError,
    BehindRepositoryError,
    DirtyRepositoryError,
    InvalidSupportBranchError,
    MultipleActiveReleaseError,
    NoActiveReleaseError,
    NoPackageError,
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
        } else if (arguments.length === 2) {
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
    branch(options = []) {
        return this.git.branchAsync(options);
    }

    /**
     * Runs git branch -vv
     * @return {Promise}
     */
    branchVerbose() {
        return Promise
            .all([
                this.config(),
                this.branch(['-a', '-vv']),
            ])
            .then(([config, summary]) => {
                const remotes = _.keys(config.remote);
                const remoteReleaseBranchRegexp = new RegExp('^remotes\\/.+\\/(' + config.gitflow.prefix.release + '.+)$');

                _.forEach(summary.branches, (branch) => {
                    const {label} = branch;

                    if (label.startsWith('[')) {
                        branch.upstream = label.substring(1, label.indexOf(']'));
                        branch.remote = branch.upstream.substring(0, branch.upstream.indexOf('/'));
                        if (_.indexOf(remotes, branch.remote) === -1) {
                            delete branch.remote;
                        }
                    } else if (remoteReleaseBranchRegexp.test(branch.name)) {
                        branch.isRemoteRelease = true;
                        branch.localName = remoteReleaseBranchRegexp.exec(branch.name)[1];
                    }
                });

                return summary;
            });
    }

    /**
     * Runs git branch -d
     * @param {string} branchName - the name of the branch to delete
     * @return {Promise}
     */
    deleteBranch(branchName) {
        return this.git.deleteLocalBranchAsync(branchName);
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
     * @param {Array} options - a string array of git pull options
     * @return {Promise}
     */
    pull(remoteName, branchName, options = []) {
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
     * @param {Array} options - a string array of git merge options
     * @return {Promise}
     */
    mergeFromTo(from, to, options = []) {
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
     * @param {Array} files - the files to stage
     * @return {Promise}
     */
    addFiles(files) {
        return this.git.addAsync(files).then(() => files);
    }

    /**
     * Resets the repository
     * @param {Array} options - array of options supported by the git reset command
     * @return {Promise}
     */
    reset(options = []) {
        return this.git.resetAsync(options);
    }

    /**
     * Stash the working directory
     * @param {Array} options - array of options supported by the git stash command
     * @return {Promise}
     */
    stash(options = []) {
        return this.git.stashAsync(options);
    }

    /**
     * Gets a summary of the diff between 2 git references
     * @param {Array} options - a string array of git diff options
     * @return {object}
     */
    diffSummary(options = []) {
        return this.git.diffSummaryAsync(options);
    }

    // git flow methods

    /**
     * Gets the git configuration for the current directory
     * @return {Promise}
     */
    config() {
        if (this._config) {
            return Promise.resolve(this._config);
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
            return module.version || '-';
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
        .then((result) => {
            const success = _.filter(result, {success: true});

            if (_.isEmpty(success)) {
                let code = _.get(result[0], 'error.code');
                let count = _.reduce(result, (total, item) => {
                    if (_.get(item, 'error.code') === code) {
                        total++;
                    }

                    return total;
                }, 0);

                if (count === result.length) {
                    if (code === 'ENOENT') {
                        throw new NoPackageError();
                    } else {
                        throw result[0].error;
                    }
                } else {
                    throw new Error();
                }
            }

            return _.map(success, 'filename');
        });
    }

    /**
     * [git flow] Starts a new feature
     * @param {string} name - the relase name
     * @param {string} base - an optional base for the feature, instead of develop
     * @return {Promise}
     */
    featureStart(name, base) {
        const args = ['flow', 'feature', 'start'];
        if (name) {
            args.push(name);

            if (base) {
                args.push(base);
            }
        }

        return this.git.rawAsync(args);
    }

    /**
     * [git flow] Publishes the current release
     * @param {string} name - the feature name
     * @return {Promise}
     */
    featurePublish(name) {
        const args = ['flow', 'feature', 'publish'];
        if (name) {
            args.push(name);
        }

        return this.git.rawAsync(args);
    }

    /**
     * [git flow] Finishes the current release
     * @param {string} name - the feature name
     * @return {Promise}
     */
    featureFinish(name) {
        process.env['GIT_MERGE_AUTOEDIT'] = 'no';
        const args = ['flow', 'feature', 'finish'];
        if (name) {
            args.push(name);
        }

        return this.git.rawAsync(args);
    }

    /**
     * [git flow] Starts a new release
     * @param {string} name - the relase name
     * @param {string} base - an optional base for the feature, instead of develop
     * @return {Promise}
     */
    releaseStart(name, base) {
        const args = ['flow', 'release', 'start'];
        if (name) {
            args.push(name);

            if (base) {
                args.push(base);
            }
        }

        return this.git.rawAsync(args);
    }

    /**
     * [git flow] Publishes the current release
     * @param {string} name - the release name
     * @return {Promise}s
     */
    releasePublish(name) {
        const args = ['flow', 'release', 'publish'];
        if (name) {
            args.push(name);
        }

        return this.git.rawAsync(args);
    }

    /**
     * [git flow] Finishes the current release
     * @param {string} name - the release name
     * @param {string[]} extras - additional command arguments
     * @return {Promise}
     */
    releaseFinish(name, extras = []) {
        process.env['GIT_MERGE_AUTOEDIT'] = 'no';
        const args = ['flow', 'release', 'finish'];
        if (name) {
            args.push(name);
        }

        args.push('-m', 'Finish', ...extras);

        return this.git.rawAsync(args);
    }

    /**
     * [git flow] Starts a new hotfix
     * @param {string} name - the hotfix name
     * @param {string} base - an optional base for the hotfix, instead of develop
     * @return {Promise}
     */
    hotfixStart(name, base) {
        const args = ['flow', 'hotfix', 'start'];
        if (name) {
            args.push(name);

            if (base) {
                args.push(base);
            }
        }

        return this.git.rawAsync(args);
    }

    /**
     * [git flow] Publishes the current hotfix
     * @param {string} name - the hotfix name
     * @return {Promise}s
     */
    hotfixPublish(name) {
        const args = ['flow', 'hotfix', 'publish'];
        if (name) {
            args.push(name);
        }

        return this.git.rawAsync(args);
    }

    /**
     * [git flow] Finishes the current hotfix
     * @param {string} name - the hotfix name
     * @return {Promise}
     */
    hotfixFinish(name) {
        process.env['GIT_MERGE_AUTOEDIT'] = 'no';
        const args = ['flow', 'hotfix', 'finish'];
        if (name) {
            args.push(name);
        }

        args.push('-m', 'Finish');

        return this.git.rawAsync(args);
    }

    /**
     * [git flow] Starts a new bugfix
     * @param {string} name - the bugfix name
     * @param {string} base - an optional base for the bugfix, instead of develop
     * @return {Promise}
     */
    bugfixStart(name, base) {
        const args = ['flow', 'bugfix', 'start'];
        if (name) {
            args.push(name);

            if (base) {
                args.push(base);
            }
        }

        return this.git.rawAsync(args);
    }

    /**
     * [git flow] Publishes the current bugfix
     * @param {string} name - the bugfix name
     * @return {Promise}s
     */
    bugfixPublish(name) {
        const args = ['flow', 'bugfix', 'publish'];
        if (name) {
            args.push(name);
        }

        return this.git.rawAsync(args);
    }

    /**
     * [git flow] Finishes the current bugfix
     * @param {string} name - the bugfix name
     * @return {Promise}
     */
    bugfixFinish(name) {
        process.env['GIT_MERGE_AUTOEDIT'] = 'no';
        const args = ['flow', 'bugfix', 'finish'];
        if (name) {
            args.push(name);
        }

        args.push('-m', 'Finish');

        return this.git.rawAsync(args);
    }

    /**
     * [git flow] Starts a new support branch
     * @param {string} name - the support branch name
     * @param {string} base - a base for the support
     * @return {Promise}
     */
    supportStart(name, base) {
        const args = ['flow', 'support', 'start'];
        if (name) {
            args.push(name);

            if (base) {
                args.push(base);
            }
        }

        return this.git.rawAsync(args);
    }

    /**
     * [git flow] Publishes the current support branch
     * @param {string} name - the support branch name
     * @return {Promise}s
     */
    supportPublish(name) {
        return Promise
            .all([
                this.config(),
                this.status()
            ])
            .then(([config, status]) => {
                let support;
                const prefix = config.gitflow.prefix.support;

                if (name) {
                    support = prefix + name;
                } else if (status.current.startsWith(prefix)) {
                    support = config.current;
                } else {
                    throw new InvalidSupportBranchError();
                }

                const remote = this.getDefaultRemote(config);
                return this.push(remote, support);
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
                this.branchVerbose(),
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

                branches = _.find(summary.branches, (branch) => {
                    return branch.isRemoteRelease;
                });

                if (_.isArray(branches) && _.size(branches) > 1) {
                    throw new MultipleActiveReleaseError();
                } else if (_.isObject(branches)) {
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
                    return false;
                } else {
                    throw error;
                }
            })
            .then((result) => {
                if (result) {
                    throw new ActiveReleaseError();
                }

                return !result;
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
    updatePackageFile(filename, patch) {
        const packagePath = path.join(this.path, filename);
        return fs
            .readFileAsync(packagePath)
            .then((content) => {
                const packageContent = JSON.parse(content.toString());
                _.merge(packageContent, patch);
                return fs.writeFileAsync(packagePath, JSON.stringify(packageContent, null, 2));
            })
            .then(() => {
                return {filename, success: true};
            })
            .catch((error) => {
                return {filename, error};
            });
    }

    /**
     * Gets the status and throws errors if the repository is either dirty, ahead or behind its remote
     * @return {Promise}
     */
    ensureCleanState() {
        return this
            .detailedStatus()
            .then((status) => {
                if (status.editCount !== 0) {
                    throw new DirtyRepositoryError();
                } else if (status.ahead !== 0) {
                    throw new AheadRepositoryError();
                } else if (status.behind !== 0) {
                    throw new BehindRepositoryError();
                }

                return true;
            });
    }

    /**
     * Gets the remote associated to the git flow master branch
     * @param {object} config - a git config object
     * @return {string}
     */
    getDefaultRemote(config) {
        return config.branch[config.gitflow.branch.master].remote;
    }

    /**
     * Gets how much commits the left branch has more than the right one
     * @param {string} left - a git reference
     * @param {string} right - a git reference
     * @return {string}
     */
    countRevisions(left, right) {
        return this
            .git
            .rawAsync(['rev-list', '--left-right', '--count', `${left}...${right}`])
            .then((revList) => {
                const regex = /^(\d+)\s+(\d+)/;
                const matches = regex.exec(revList);

                if (revList && matches) {
                    const leftCount = parseInt(matches[1], 10) || 0;
                    const rightCount = parseInt(matches[2], 10) || 0;
                    const diff = rightCount - leftCount;
                    return {
                        [left]: leftCount,
                        [right]: rightCount,
                        diff,
                    };
                } else {
                    throw new Error('invalid comparison');
                }
            });
    }

    /**
     * Checks whether or not the next release will be worth creating.
     * IE: is base or develop ahead of master.
     * @param {string} base - an optional base for the release, instead of develop
     * @return {boolean}
     */
    isNextReleaseWorthCreating(base) {
        return this
            .config()
            .then((config) => {
                const left = config.gitflow.branch.master;
                const right = base || config.gitflow.branch.develop;
                return Promise.all([
                    this.countRevisions(left, right),
                    this.diffSummary([left, right]),
                ]);
            })
            .then(([revisions, summary]) => {
                return revisions.diff > 0 && summary.files.length > 0;
            });
    }
}
