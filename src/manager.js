'use strict';

const _ = require('lodash');
const path = require('path');
const Promise = require('bluebird');

const fs = require('./fs');
const Group = require('./group');
const Directory = require('./directory');
const ConfigFileName = '.mg-config.json';
const {
    GroupMissingError,
    NoConfigFileError,
} = require('./errors');


/**
 * Represents a group manager.
 * Loads the configuration and the active group.
 */
class Manager {
    static get ConfigFileName() {
        return ConfigFileName;
    }

    constructor() {
        this.config = null;
        this.activeGroup = null;
        this.cwd = new Directory();
    }

    /**
     * Gets the configuration
     * @return {Promise}
     */
    getConfig() {
        if (this.config === null) {
            return this
                .findConfigFile()
                .then((configFilePath) => {
                    return fs.readFileAsync(configFilePath);
                })
                .then((buffer) => {
                    this.config = JSON.parse(buffer.toString());
                    return this.config;
                });
        } else {
            return Promise.resolve(this.config);
        }
    }

    /**
     * Gets multi-git config file, by priority :
     *  1. current working directory
     *  2. home directory
     *  3. module directory
     * @return {Promise}
     */
    findConfigFile() {
        const possiblePaths = [
            path.join(process.cwd(), ConfigFileName),
            path.join(process.env.HOME, ConfigFileName),
            path.join(__dirname, '../', ConfigFileName),
        ];

        return Promise
            .map(possiblePaths, (path) => {
                return fs.statAsync(path).catch((error) => { return {error}; });
            })
            .then((results) => {
                let i = -1;
                let path = '';

                while (path === '' && ++i < results.length) {
                    let result = results[i];
                    if (result.size > 0) {
                        path = possiblePaths[i];
                    }
                }

                if (path === '') {
                    throw new NoConfigFileError();
                }

                return path;
            });
    }

    /**
     * Gets a group by its name and sets it as active.
     * @param {string} groupName - the group name
     * @return {Promise}
     */
    getGroup(groupName) {
        if (this.activeGroup) {
            return Promise.resolve(this.activeGroup);
        } else {
            return this.initActiveGroup(groupName);
        }
    }

    /**
     * Initialize the current group to the requested group.
     * Defaults to the current working directory.
     * @param {string} groupName - the group name
     * @return {Promise}
     */
    initActiveGroup(groupName) {
        return Promise
            .resolve()
            .then(() => {
                if (_.isUndefined(groupName)) {
                    return this.getCwdGroup();
                } else {
                    return this.getGroupByName(groupName);
                }
            })
            .then((group) => {
                this.activeGroup = group;
                return Promise.reduce(group.members, (result, member) => {
                    return member.hasGit().then((hasGit) => {
                        if (hasGit) {
                            result.push(member);
                        }

                        return result;
                    });
                }, []);
            })
            .then((members) => {
                this.activeGroup.members = members;
                return Promise.map(members, (member) => {
                    return member.loadGit();
                });
            })
            .then((members) => {
                return this.activeGroup;
            });
    }

    /**
     * Gets a group by its name from the configuration.
     * @param {string} groupName - the group name
     * @return {Promise}
     */
    getGroupByName(groupName) {
        return this
            .getConfig()
            .then((config) => {
                const group = config.groups[groupName];

                if (!group) {
                    throw new GroupMissingError();
                }

                group.members = _(config.projects).pick(group.members).values().value();

                return new Group(group);
            });
    }


    /**
     * Gets the current working directory group.
     *  - if the cwd belongs to a git repository
     * then a group composed of all groups of which the cwd is a member is returned
     *  - otherwise a group composed of all subdirectories of the cwd is returned
     * @return {Promise}
     */
    getCwdGroup() {
        return this
            .cwd
            .hasGit()
            .then((hasGit) => {
                if (hasGit) {
                    return this
                        .getConfig()
                        .then((config) => {
                            const groups = _.filter(config.groups, (group) => {
                                return group.members.indexOf(this.cwd.name) > -1;
                            });

                            const members = _.chain(groups)
                                .reduce((result, group) => {
                                    _.forEach(group.members, (member) => {
                                        result[member] = true;
                                    });

                                    return result;
                                }, {})
                                .keys()
                                .thru((memberNames) => {
                                    return _.pick(config.projects, memberNames);
                                })
                                .value();

                            return new Group(this.cwd.name + ' - virtual', members);
                        });
                } else {
                    return fs
                        .readdirAsync(this.cwd.path)
                        .then((files) => {
                            return Promise.map(files, (file) => {
                                return fs
                                    .statAsync(file)
                                    .then((stat) => {
                                        stat.name = file;
                                        return stat;
                                    });
                            });
                        })
                        .then((stats) => {
                            const members = _.reduce(stats, (result, stat) => {
                                if (stat.isDirectory()) {
                                    result.push(path.join(this.cwd.path, stat.name));
                                }

                                return result;
                            }, []);

                            return new Group(this.cwd.name + ' - virtual', members);
                        });
                }
            });
    }
}

module.exports = Manager;
