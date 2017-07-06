import _ from 'lodash';
import path from 'path';
import Promise from 'bluebird';

import fs from './fs';
import Directory from './directory';
import Group from './group';
import {
    GroupMissingError,
    NoConfigFileError,
    ProjectMissingError,
} from './errors';

const ConfigFileName = '.mg-config.json';

/**
 * Represents a group manager.
 * Loads the configuration and the active group.
 */
export default class Manager {
    /**
     * Gets multi-git configuration file name
     * @return {string}
     */
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
     * Gets either a group by its name
     * or creates and returns a virtual group with a single project in it
     * before setting it as active.
     * @param {string} groupName - the group name
     * @param {string} [projectName] - the project name
     * @return {Promise}
     */
    getGroup(groupName, projectName) {
        if (this.activeGroup) {
            return Promise.resolve(this.activeGroup);
        } else {
            return this.initActiveGroup(groupName, projectName);
        }
    }

    /**
     * Initializes the current group to the requested group.
     * Defaults to the current working directory.
     * @param {string} groupName - the group name
     * @param {string} [projectName] - the project name
     * @return {Promise}
     */
    initActiveGroup(groupName, projectName) {
        return Promise
            .resolve()
            .then(() => {
                if (_.isUndefined(groupName) && _.isUndefined(projectName)) {
                    return this.getCwdGroup();
                } else if (_.isUndefined(groupName) && !_.isUndefined(projectName)) {
                    return this.getSingleProjectGroup(projectName);
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
            .then(() => {
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

                group.members = _.values(_.pick(config.projects, group.members));

                return new Group(group);
            });
    }


    /**
     * Gets a group containing the requested project.
     * @param {string} projectName - the project name
     * @return {Promise}
     */
    getSingleProjectGroup(projectName) {
        return this
            .getConfig()
            .then((config) => {
                const project = config.projects[projectName];

                if (!project) {
                    throw new ProjectMissingError();
                }

                return new Group(projectName + ' - virtual', [project]);
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

                            const memberNames = _.keys(_.reduce(groups, (result, group) => {
                                _.forEach(group.members, (member) => {
                                    result[member] = true;
                                });

                                return result;
                            }, {}));

                            const members = _.pick(config.projects, memberNames);

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
