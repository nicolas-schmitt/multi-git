'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const Directory = require('./directory');

const {
    ActiveReleaseError,
    GroupMissingError,
    NoConfigFileError,
} = require('./errors');

class Group {
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

    status() {
        return Promise.map(this.members, (member) => {
            return member
                .status()
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    detailedStatus() {
        return Promise.map(this.members, (member, i) => {
            return member.detailedStatus()
            .then((status) => {
                if (i === 2) {
                    throw new NoConfigFileError();
                } else {
                    return status;
                }
            })
            .catch((error) => {
                return {isRejected: true, parent: member, error};
            });
        });
    }


    fetch() {
        return Promise.map(this.members, (member) => {
            return member
                .fetch()
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    checkout(what) {
        return Promise.map(this.members, (member) => {
            return member
                .checkout(what)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    commit(message) {
        return Promise.map(this.members, (member) => {
            return member
                .commit(message)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    branch() {
        return Promise.map(this.members, (member) => {
            return member
                .branch()
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    deleteBranch(branchName) {
        return Promise.map(this.members, (member) => {
            return member
                .deleteBranch(branchName)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    createBranch(branchName, startPoint) {
        return Promise.map(this.members, (member) => {
            return member
                .createBranch(branchName, startPoint)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

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

    pull(remoteName, branchName, options) {
        return Promise.map(this.members, (member) => {
            return member
                .pull(remoteName, branchName, options)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    mergeFromTo(from, to, options) {
        return Promise.map(this.members, (member) => {
            return member
                .mergeFromTo(from, to, options)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    tag(tagName, tagMessage) {
        return Promise.map(this.members, (member) => {
            return member
                .tag(tagName, tagMessage)
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

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

    stash(options) {
        return Promise.map(this.members, (member) => {
            return member
                .stash(options)
                .then((result) => {
                    return {isRejected: false, parent: member};
                })
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                });
        });
    }

    ensureNoActiveRelease() {
        return Promise.map(this.members, (member) => {
            return member
                .ensureNoActiveRelease()
                .then((success) => {
                    return {success, parent: member};
                })
                .catch((error) => {
                    return {isRejected: true, parent: member, error};
                })
                .then((results) => {
                    if (_.any(_.filter(results, 'isRejected'))) {
                        throw new ActiveReleaseError();
                    }

                    return true;
                });
        });
    }
}

module.exports = Group;
