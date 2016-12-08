import _ from 'lodash';
import Promise from 'bluebird';
import bumpVersion from 'bump-regex';

import Directory from './directory';
import {ActiveReleaseError, InvalidVersionError} from './errors';

const VersionRegexp = new RegExp('^\\d+\\.\\d+\\.\\d+(?:-\\w+(?:\\.\\d+)?)?$');
const bumpVersionAsync = Promise.promisify(bumpVersion);

/**
 * Represents a group of directories.
 * Either the specified directory or the current working directory.
 * @constructor
 * @param {string|object} path - either a directory path or a config object.
 */
export default class Group {
    constructor() {
        if (_.size(arguments) === 1 && _.isObject(arguments[0])) {
            const config = arguments[0];
            this.name = config.name;
            this.members = config.members;
        } else {
            this.name = arguments[0] || '';
            this.members = arguments[1] || [];
        }

        this.members = _.map(this.members, (member) => {
            return new Directory(member);
        });
    }

    /**
     * Runs git status
     * @return {Promise}
     */
    status() {
        return Promise.map(this.members, (member) => {
            return member
                .status()
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Runs both git status & member.getVersion(),
     * merges the result
     * @return {Promise}
     */
    detailedStatus() {
        return Promise.map(this.members, (member) => {
            return member
            .detailedStatus()
            .catch((error) => {
                return {isRejected: true, parent: member, error};
            });
        });
    }

    /**
     * Runs git fetch
     * @return {Promise}
     */
    fetch() {
        return Promise.map(this.members, (member) => {
            return member
                .fetch()
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Runs git checkout
     * @param {string} what - what to checkout
     * @return {Promise}
     */
    checkout(what) {
        return Promise.map(this.members, (member) => {
            return member
                .checkout(what)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Runs git commit
     * @param {string} messgae - the commit message
     * @return {Promise}
     */
    commit(message) {
        return Promise.map(this.members, (member) => {
            return member
                .commit(message)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Runs git branch
     * @return {Promise}
     */
    branch() {
        return Promise.map(this.members, (member) => {
            return member
                .branch()
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Runs git branch -d
     * @param {string} branchName - the name of the branch to delete
     * @return {Promise}
     */
    deleteBranch(branchName) {
        return Promise.map(this.members, (member) => {
            return member
                .deleteBranch(branchName)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Runs git branch
     * @param {string} branchName - the name of the branch to create
     * @param {string} startPoint - the branch starting point
     * @return {Promise}
     */
    createBranch(branchName, startPoint) {
        return Promise.map(this.members, (member) => {
            return member
                .createBranch(branchName, startPoint)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Runs git push
     * @param {string} remoteName - the remote name to push to
     * @param {string} branchName - the branch name to push
     * @return {Promise}
     */
    push(remoteName, branchName) {
        return Promise.map(this.members, (member) => {
            return member
                .push(remoteName, branchName)
                .then(() => {
                    return {isRejected: false, parent: member};
                })
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Runs git push
     * @param {string} remoteName - the remote name to push to
     * @return {Promise}
     */
    pushTags(remoteName) {
        return Promise.map(this.members, (member) => {
            return member
                .pushTags(remoteName)
                .then(() => {
                    return {isRejected: false, parent: member};
                })
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Runs git pull
     * @param {string} remoteName - the remote name to pull from
     * @param {string} branchName - the branch name to pull
     * @param {array} options - a string array of git pull options
     * @return {Promise}
     */
    pull(remoteName, branchName, options) {
        return Promise.map(this.members, (member) => {
            return member
                .pull(remoteName, branchName, options)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
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
        return Promise.map(this.members, (member) => {
            return member
                .mergeFromTo(from, to, options)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Creates a tag
     * @param {string} tagName - the tag name
     * @param {string} tagMessage - the tag message
     * @return {Promise}
     */
    tag(tagName, tagMessage) {
        return Promise.map(this.members, (member) => {
            return member
                .tag(tagName, tagMessage)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Stages files
     * @param {array} files - the files to stage
     * @return {Promise}
     */
    addFiles(files) {
        return Promise.map(this.members, (member) => {
            return member
                .addFiles(files)
                .then(() => {
                    return {isRejected: false, parent: member};
                })
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Unstages files
     * @param {array} files - the files to stage
     * @return {Promise}
     */
    unstageFiles(files) {
        return Promise.map(this.members, (member) => {
            return member
                .reset(['HEAD', ...files])
                .then(() => {
                    return {isRejected: false, parent: member};
                })
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Stash the working directory
     * @param {array} options - array of options supported by the git stash command
     * @return {Promise}
     */
    stash(options) {
        return Promise.map(this.members, (member) => {
            return member
                .stash(options)
                .then(() => {
                    return {isRejected: false, parent: member};
                })
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * [git flow] Ensures there is no active release
     * @return {Promise}
     */
    ensureNoActiveRelease() {
        return Promise.map(this.members, (member) => {
            return member
                .ensureNoActiveRelease()
                .then((success) => {
                    return {success, parent: member};
                })
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * [git flow] Pushes master, develop & tags to origin
     * @return {Promise}
     */
    pushAllDefaults() {
        return Promise.map(this.members, (member) => {
            return member
                .pushAllDefaults()
                .then(() => {
                    return {isRejected: false, parent: member};
                })
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * Gets the status and throws errors if the repository is either dirty, ahead or behind its remote
     * @return {Promise}
     */
    ensureCleanState() {
        return Promise.map(this.members, (member) => {
            return member
                .ensureCleanState()
                .then(() => {
                    return {isRejected: false, parent: member};
                })
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * [git flow] Gets the group latest version
     * @param {string} bump - the version bump, can be any valid semver
     * @return {Promise}
     */
    getNextVersion(bump = 'patch') {
        return this
            .getLatestVersion()
            .then((version) => {
                if (VersionRegexp.test(bump)) {
                    return bump;
                } else if (_.isNil(bump) || _.indexOf(['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'], bump) !== -1) {
                    return bumpVersionAsync({str: `version: ${version}`, type: bump})
                        .then((result) => {
                            return result.new;
                        })
                        .catch((error) => {
                            throw new InvalidVersionError(error);
                        });
                } else {
                    throw new InvalidVersionError();
                }
            });
    }

    /**
     * [git flow] Gets the group latest version
     * @return {Promise}
     */
    getLatestVersion() {
        return Promise.map(this.members, (member) => {
            return member.getVersion();
        })
        .then((versions) => {
            versions.sort();
            return versions[versions.length - 1];
        });
    }

    /**
     * [git flow] Starts a new release
     * @return {Promise}
     */
    startRelease(version) {
        return Promise.map(this.members, (member) => {
            return member
                .startRelease(version)
                .then(() => {
                    return member.checkout('-');
                })
                .then(() => {
                    return {isRejected: false, parent: member};
                })
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    /**
     * [git flow] Publishes the current release
     * @return {Promise}
     */
    publishRelease() {
        return Promise.map(this.members, (member) => {
            return member
                .publishRelease()
                .then(() => {
                    return {isRejected: false, parent: member};
                })
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });;
        });
    }

    /**
     * [git flow] Finishes the current release
     * @return {Promise}
     */
    finishRelease() {
        return Promise.map(this.members, (member) => {
            return member
                .finishRelease()
                .then(() => {
                    return {isRejected: false, parent: member};
                })
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }
}
