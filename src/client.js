/* eslint-disable no-console */

import 'colors';
import _ from 'lodash';
import Table from 'cli-table2';
import yargs from 'yargs';

import Manager from './manager';
import {ChainBreaker} from './errors';

let defaultCommandList = {};

/**
 * Represents the multi-git client. Handles the prompt.
 * @constructor
 * @param {object} manager - a multi-git manager
 */
export default class Client {
    constructor(manager) {
        this.commands = defaultCommandList;
        this.manager = manager || new Manager();

        const cmdName = Client.getCLIName(yargs);
        yargs.usage(`${cmdName} <command> [options]`)
            .option('g', {
                alias: 'group',
                type: 'string',
                describe: 'The project group name',
                global: true
            })
            .demand(1, 'You must provide a valid command')
            .wrap(Math.min(120, yargs.terminalWidth()));
    }

    /**
     * Sets a new command or update an existing one
     * @param {object} command - a yargs command description object
     */
    setCommand(name, command) {
        this.commands[name] = command;
    }

    /**
     * Sets or updates multiple commands
     * @param {object} commands - an associative array of command
     */
    setCommands(commands) {
        _.assign(this.commands, commands);
    }

    /**
     * Adds all commands from this.commands to yargs
     */
    loadCommands() {
        _.forEach(this.commands, (command) => {
            if (_.isFunction(command.handler)) {
                command.handler = command.handler.bind(null, this.manager);
            }

            yargs.command(command);
        });
    }

    /**
     * Parses the command line and run the suitable handler
     * @returns {*}
     */
    run() {
        this.loadCommands();
        return yargs.argv;
    }

    //region Command handlers
    /**
     * status command handler
     * @param {Manager} manager - multi-git manager
     * @param {yargs} argv - current yargs argv
     * @return {Promise}
     */
    static runStatus(manager, argv) {
        const {group: groupName} = argv;

        return manager
            .getGroup(groupName)
            .then((group) => {
                return group.detailedStatus();
            })
            .then(Client.logStatusTable)
            .done();
    }

    /**
     * fetch command handler
     * @param {Manager} manager - multi-git manager
     * @param {yargs} argv - current yargs argv
     * @return {Promise}
     */
    static runFetch(manager, argv) {
        const {group: groupName} = argv;
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.detailedStatus();
            })
            .then(Client.logStatusTable)
            .done();
    }

    /**
     * pull command handler
     * @param {Manager} manager - multi-git manager
     * @param {yargs} argv - current yargs argv
     * @return {Promise}
     */
    static runPull(manager, argv) {
        const {group: groupName} = argv;
        const [, remoteName, branchName,] = _.get(argv, '_', []);

        return manager
            .getGroup(groupName)
            .then((group) => {
                return group.pull(remoteName, branchName);
            })
            .then(Client.logPullTable)
            .done();
    }

    /**
     * push command handler
     * @param {Manager} manager - multi-git manager
     * @param {yargs} argv - current yargs argv
     * @return {Promise}
     */
    static runPush(manager, argv) {
        const {group: groupName} = argv;
        const [, remoteName, branchName,] = _.get(argv, '_', []);

        return manager
            .getGroup(groupName)
            .then((group) => {
                return group.push(remoteName, branchName);
            })
            .then(Client.logSimpleTable)
            .done();
    }

    /**
     * checkout command handler
     * @param {Manager} manager - multi-git manager
     * @param {yargs} argv - current yargs argv
     * @return {Promise}
     */
    static runCheckout(manager, argv) {
        const {group: groupName} = argv;
        const [, branchName] = _.get(argv, '_', []);
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.checkout(branchName);
            })
            .then(() => {
                return scope.group.detailedStatus();
            })
            .then(Client.logStatusTable)
            .done();
    }

    /**
     * add command handler
     * @param {Manager} manager - multi-git manager
     * @param {yargs} argv - current yargs argv
     * @return {Promise}
     */
    static runAdd(manager, argv) {
        const {group: groupName} = argv;
        const [, ...files] = _.get(argv, '_', []);
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.addFiles(files);
            })
            .then(Client.logSimpleTable)
            .done();
    }

    /**
     * unstage command handler
     * @param {Manager} manager - multi-git manager
     * @param {yargs} argv - current yargs argv
     * @return {Promise}
     */
    static runUnstage(manager, argv) {
        const {group: groupName} = argv;
        const [, ...files] = _.get(argv, '_', []);
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.unstageFiles(files);
            })
            .then(Client.logSimpleTable)
            .done();
    }

    /**
     * stash command handler
     * @param {Manager} manager - multi-git manager
     * @param {yargs} argv - current yargs argv
     * @return {Promise}
     */
    static runStash(manager, argv) {
        const {group: groupName} = argv;
        const [, ...command] = _.get(argv, '_', []);
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.stash(command);
            })
            .then(Client.logSimpleTable)
            .done();
    }

    /**
     * git flow feature command handler
     * @param {Manager} manager - multi-git manager
     * @param {yargs} argv - current yargs argv
     * @return {Promise}
     */
    static runFeature(manager, argv) {
        const {group: groupName} = argv;
        const [, action, featureName, base] = _.get(argv, '_', []);

        let result;
        switch (action) {
            case 'start':
                result = Client.featureStart(manager, groupName, featureName, base);
                break;
            case 'publish':
                result = Client.featurePublish(manager, groupName, featureName);
                break;
            case 'finish':
                result = Client.featureFinish(manager, groupName, featureName);
                break;
            default:
                result = yargs.showHelp();
                break;
        }

        return result;
    }

    /**
     * git flow feature start command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} featureName - the feature name
     * @param {string} base - an optional base for the feature, instead of develop
     * @return {Promise}
     */
    static featureStart(manager, groupName, featureName, base) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.featureStart(featureName, base);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, creation halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }

    /**
     * git flow feature publish command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} featureName - the feature name
     * @return {Promise}
     */
    static featurePublish(manager, groupName, featureName) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.featurePublish(featureName);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, publication halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }

    /**
     * git flow feature finish command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} featureName - the feature name
     * @return {Promise}
     */
    static featureFinish(manager, groupName, featureName) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.featureFinish(featureName);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, operation halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }

    /**
     * git flow release command handler
     * @param {Manager} manager - multi-git manager
     * @param {yargs} argv - current yargs argv
     * @return {Promise}
     */
    static runRelease(manager, argv) {
        const {group: groupName} = argv;
        const [, action, featureName] = _.get(argv, '_', []);

        let result;
        switch (action) {
            case 'start':
                result = Client.releaseStart(manager, groupName, featureName);
                break;
            case 'publish':
                result = Client.releasePublish(manager, groupName, featureName);
                break;
            case 'finish':
                result = Client.releaseFinish(manager, groupName, featureName);
                break;
            default:
                result = yargs.showHelp();
                break;
        }

        return result;
    }

    /**
     * git flow release start command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} featureName - the feature name
     * @return {Promise}
     */
    static releaseStart(manager, groupName, featureName) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.releaseStart(featureName);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, creation halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }

    /**
     * git flow release publish command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} featureName - the feature name
     * @return {Promise}
     */
    static releasePublish(manager, groupName, featureName) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.releasePublish(featureName);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, publication halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }

    /**
     * git flow release finish command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} featureName - the feature name
     * @return {Promise}
     */
    static releaseFinish(manager, groupName, featureName) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.releaseFinish(featureName);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, operation halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }

    /**
     * git flow hotfix command handler
     * @param {Manager} manager - multi-git manager
     * @param {yargs} argv - current yargs argv
     * @return {Promise}
     */
    static runHotfix(manager, argv) {
        const {group: groupName} = argv;
        const [, action, hotfixName, base] = _.get(argv, '_', []);

        let result;
        switch (action) {
            case 'start':
                result = Client.hotfixStart(manager, groupName, hotfixName, base);
                break;
            case 'publish':
                result = Client.hotfixPublish(manager, groupName, hotfixName);
                break;
            case 'finish':
                result = Client.hotfixFinish(manager, groupName, hotfixName);
                break;
            default:
                result = yargs.showHelp();
                break;
        }

        return result;
    }

    /**
     * git flow hotfix start command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} hotfixName - the hotfix name
     * @param {string} base - an optional base for the hotfix, instead of develop
     * @return {Promise}
     */
    static hotfixStart(manager, groupName, hotfixName, base) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.hotfixStart(hotfixName, base);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, creation halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }

    /**
     * git flow hotfix publish command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} hotfixName - the hotfix name
     * @return {Promise}
     */
    static hotfixPublish(manager, groupName, hotfixName) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.hotfixPublish(hotfixName);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, publication halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }

    /**
     * git flow hotfix finish command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} hotfixName - the hotfix name
     * @return {Promise}
     */
    static hotfixFinish(manager, groupName, hotfixName) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.hotfixFinish(hotfixName);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, operation halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }

    /**
     * git flow bugfix command handler
     * @param {Manager} manager - multi-git manager
     * @param {yargs} argv - current yargs argv
     * @return {Promise}
     */
    static runBugfix(manager, argv) {
        const {group: groupName} = argv;
        const [, action, bugfixName, base] = _.get(argv, '_', []);

        let result;
        switch (action) {
            case 'start':
                result = Client.bugfixStart(manager, groupName, bugfixName, base);
                break;
            case 'publish':
                result = Client.bugfixPublish(manager, groupName, bugfixName);
                break;
            case 'finish':
                result = Client.bugfixFinish(manager, groupName, bugfixName);
                break;
            default:
                result = yargs.showHelp();
                break;
        }

        return result;
    }

    /**
     * git flow bugfix start command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} bugfixName - the bugfix name
     * @param {string} base - an optional base for the bugfix, instead of develop
     * @return {Promise}
     */
    static bugfixStart(manager, groupName, bugfixName, base) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.bugfixStart(bugfixName, base);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, creation halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }

    /**
     * git flow bugfix publish command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} bugfixName - the bugfix name
     * @return {Promise}
     */
    static bugfixPublish(manager, groupName, bugfixName) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.bugfixPublish(bugfixName);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, publication halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }

    /**
     * git flow bugfix finish command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} bugfixName - the bugfix name
     * @return {Promise}
     */
    static bugfixFinish(manager, groupName, bugfixName) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.bugfixFinish(bugfixName);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, operation halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }

        /**
     * git flow support command handler
     * @param {Manager} manager - multi-git manager
     * @param {yargs} argv - current yargs argv
     * @return {Promise}
     */
    static runSupport(manager, argv) {
        const {group: groupName} = argv;
        const [, action, supportName, base] = _.get(argv, '_', []);

        let result;
        switch (action) {
            case 'start':
                result = Client.supportStart(manager, groupName, supportName, base);
                break;
            case 'publish':
                result = Client.supportPublish(manager, groupName, supportName);
                break;
            default:
                result = yargs.showHelp();
                break;
        }

        return result;
    }

    /**
     * git flow support start command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} supportName - the support name
     * @param {string} base - an optional base for the support, instead of develop
     * @return {Promise}
     */
    static supportStart(manager, groupName, supportName, base) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.supportStart(supportName, base);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, creation halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }

    /**
     * git flow support publish command handler
     * @param {Manager} manager - multi-git manager
     * @param {string} groupName - the group name
     * @param {string} supportName - the support name
     * @return {Promise}
     */
    static supportPublish(manager, groupName, supportName) {
        const scope = {};

        return manager
            .getGroup(groupName)
            .then((group) => {
                scope.group = group;
                return group.fetch();
            })
            .then(() => {
                return scope.group.supportPublish(supportName);
            })
            .then((result) => {
                Client.logSimpleTable(result);
            })
            .catch((error) => {
                if (error instanceof ChainBreaker) {
                    console.log('Encountered some errors, publication halted'.yellow);
                    Client.logSimpleTable(scope.result);
                }
                else if (error && error.message) {
                    console.log(error.message.red);
                } else {
                    console.log('Something went wrong (yeah, i know...)'.red);
                }
            })
            .done();
    }
    //endregion

    //region Output
    /**
     * logs a table with 2 columns: project & result ;
     * suitable for logging a success / failure by project
     * @param {Array} result - a command result array
     */
    static logSimpleTable(result) {
        if (_.isEmpty(result)) {
            return;
        }

        const table = new Table({
            head: ['', 'result'.cyan],
            style: {
                head: []
            }
        });

        _.forEach(result, (item) => {
            if (item.isRejected) {
                table.push([
                    item.parent.name,
                    {content: item.error.message.red}
                ]);
            } else {
                table.push([
                    item.parent.name,
                    'success'.green,
                ]);
            }
        });

        console.log(table.toString());
    }

    /**
     * logs a table with 4 columns: project, changes, insertions & deletions ;
     * suitable a for logging a pull result
     * @param {Array} result - a pull command result array
     */
    static logPullTable(summaries) {
        if (_.isEmpty(summaries)) {
            return;
        }

        const table = new Table({
            head: ['', 'changes'.cyan, 'insertions'.cyan, 'deletions'.cyan],
            style: {
                head: []
            }
        });

        _.forEach(summaries, (summary) => {
            if (summary.isRejected) {
                table.push([
                    summary.parent.name,
                    {colSpan: 3, content: summary.error.message.red}
                ]);
            } else {
                table.push([
                    summary.parent.name,
                    summary.summary.changes,
                    summary.summary.insertions,
                    summary.summary.deletions
                ]);
            }
        });

        console.log(table.toString());
    }

    /**
     * logs a table with 7 columns: project, version, status, branch, upstream, ahead & behind ;
     * suitable a for logging a status result
     * @param {Array} result - a status command result array
     */
    static logStatusTable(statutes) {
        if (_.isEmpty(statutes)) {
            return;
        }

        const table = new Table({
            head: ['', 'version'.cyan, 'status'.cyan, 'branch'.cyan, 'upstream'.cyan, 'ahead'.cyan, 'behind'.cyan],
            style: {
                head: []
            }
        });

        _.forEach(statutes, (status) => {
            if (status.isRejected) {
                table.push([
                    status.parent.name,
                    {colSpan: 6, content: status.error.message.red}
                ]);
            } else {
                table.push([
                    status.parent.name,
                    status.version,
                    status.editCount === 0 ? status.text.green : status.text.red,
                    status.current,
                    status.tracking,
                    status.ahead,
                    status.behind
                ]);
            }
        });

        console.log(table.toString());
    }
    //endregion

    //region Helpers
    /**
     * Get the last part of the current cli full path
     * @param {object} yargs - yargs object
     * @returns {string}
     */
    static getCLIName(yargs) {
        return _.last(yargs['$0'].split('/'));
    }
    //endregion
}

defaultCommandList = {
    status: {
        command: 'status',
        aliases: ['st'],
        desc: 'Run git status for the selected project group',
        builder: (yargs) => {
            const cmdName = Client.getCLIName(yargs);
            return yargs
                .help('h')
                .alias('h', 'help')
                .usage(`${cmdName} status [-g group_name]`)
                .example(`${cmdName} status -g tools`, 'Show the status of the tools project group');
        },
        handler: Client.runStatus
    },
    fetch: {
        command: 'fetch',
        aliases: ['fe'],
        desc: 'Run git fetch for the selected project group',
        builder: (yargs) => {
            const cmdName = Client.getCLIName(yargs);
            return yargs
                .help('h')
                .alias('h', 'help')
                .usage(`${cmdName} fetch [-g group_name]`)
                .example(`${cmdName} fetch -g tools`, 'Run git fetch on the tools project group');
        },
        handler: Client.runFetch
    },
    pull: {
        command: 'pull',
        aliases: ['pl'],
        desc: 'Pull the tracked branch <remote>/<branch> for each project within the group',
        builder: (yargs) => {
            const cmdName = Client.getCLIName(yargs);
            return yargs
                .help('h')
                .alias('h', 'help')
                .usage(`${cmdName} pull [remote branch] [-g group_name]`)
                .example(`${cmdName} pull -g tools`, 'Run git pull on the tools project group')
                .example(`${cmdName} pull origin master -g tools`, 'Run git pull origin master on the tools project group')
                .argv;
        },
        handler: Client.runPull
    },
    push: {
        command: 'push',
        aliases: ['ps'],
        desc: 'Push the tracked branch <remote>/<branch> for each project within the group',
        builder: (yargs) => {
            const cmdName = Client.getCLIName(yargs);
            return yargs
                .help('h')
                .alias('h', 'help')
                .usage(`${cmdName} push [remote branch] [-g group_name]`)
                .example(`${cmdName} push -g tools`, 'Run git push on the tools project group')
                .example(`${cmdName} push origin master -g tools`, 'Run git push origin master on the tools project group')
                .argv;
        },
        handler: Client.runPush
    },
    checkout: {
        command: 'checkout',
        aliases: ['co'],
        desc: 'Checkout the same branch for each project within the selected group',
        builder: (yargs) => {
            const cmdName = Client.getCLIName(yargs);
            return yargs
                .help('h')
                .alias('h', 'help')
                .demand(1, 'You must provide a valid git ref to checkout')
                .usage(`${cmdName} checkout <what> [-g group_name]`)
                .example(`${cmdName} checkout develop -g tools`, 'Checkout the branch develop of the tools project group')
                .argv;
        },
        handler: Client.runCheckout
    },
    add: {
        command: 'add',
        aliases: ['a'],
        desc: 'Stage one or more files for each project within the selected group',
        builder: (yargs) => {
            const cmdName = Client.getCLIName(yargs);
            return yargs
                .help('h')
                .alias('h', 'help')
                .demand(1, 'You must provide a valid file path to add')
                .usage(`${cmdName} add <what> [-g group_name]`)
                .example(`${cmdName} add axe.js -g tools`, 'Stage axe.js for the tools project group')
                .argv;
        },
        handler: Client.runAdd
    },
    unstage: {
        command: 'unstage',
        desc: 'Unstage one or more files for each project within the selected group',
        builder: (yargs) => {
            const cmdName = Client.getCLIName(yargs);
            return yargs
                .help('h')
                .alias('h', 'help')
                .demand(1, 'You must provide a valid file path to unstage')
                .usage(`${cmdName} unstage <what> [-g group_name]`)
                .example(`${cmdName} unstage axe.js -g tools`, 'Unstage axe.js for the tools project group')
                .argv;
        },
        handler: Client.runUnstage
    },
    stash: {
        command: 'stash',
        desc: 'Stash changes on each project within the selected group',
        builder: (yargs) => {
            const cmdName = Client.getCLIName(yargs);
            return yargs
                .help('h')
                .alias('h', 'help')
                .usage(`${cmdName} stash [pop|drop|apply] [-g group_name]`)
                .example(`${cmdName} stash -g tools`, 'Stash staged changes for the tools project group')
                .argv;
        },
        handler: Client.runStash
    },
    feature: {
        command: 'feature',
        aliases: ['ft'],
        desc: '[git-flow] Create a new feature for the selected group',
        builder: (yargs) => {
            const cmdName = Client.getCLIName(yargs);
            return yargs
                .help('h')
                .alias('h', 'help')
                .demand(1, 'You must provide a valid command')
                .usage(`${cmdName} feature <start|publish|finish> <feature_name> [-g group_name]`)
                .example(`${cmdName} feature start add-shovel -g tools`, 'Create a new feature "add-shovel" for the tools project group')
                .example(`${cmdName} feature publish add-shovel -g tools`, 'Create a new feature "add-shovel" for the tools project group')
                .example(`${cmdName} feature finish add-shovel -g tools`, 'Finish the feature "add-shovel" for the tools project group')
                .example(`${cmdName} feature finish -g tools`, 'Finish the current feature for the tools project group')
                .argv;
        },
        handler: Client.runFeature
    },
    release: {
        command: 'release',
        aliases: ['rl'],
        desc: '[git-flow] Create a new version for the selected group',
        builder: (yargs) => {
            const cmdName = Client.getCLIName(yargs);
            return yargs
                .help('h')
                .alias('h', 'help')
                .demand(1, 'You must provide a valid command')
                .option('y', {
                    alias: 'yes',
                    type: 'boolean',
                    describe: 'Automatically confirm the branch creation'
                })
                .usage(`${cmdName} release <start|publish|finish> [patch|minor|major|version] -g group_name`)
                .example(`${cmdName} release start -g extranet`, 'Creates a patch release on every member of the extranet project group')
                .example(`${cmdName} release start 1.2.3 -g extranet`, 'Creates a release named 1.2.3 on every member of the extranet project group')
                .example(`${cmdName} release publish -g extranet`, 'Publishes the current release on every member of the extranet project group')
                .example(`${cmdName} release finish -g extranet`, 'Finishes the current release on every member of the extranet project group')
                .argv;
        },
        handler: Client.runRelease
    },
    hotfix: {
        command: 'hotfix',
        aliases: ['hf'],
        desc: '[git-flow] Create a new hotfix for the selected group',
        builder: (yargs) => {
            const cmdName = Client.getCLIName(yargs);
            return yargs
                .help('h')
                .alias('h', 'help')
                .demand(1, 'You must provide a valid command')
                .usage(`${cmdName} hotfix <start|publish|finish> <hotfix_name> [hotfix_base] [-g group_name]`)
                .example(`${cmdName} hotfix start fix-shovel -g tools`, 'Create a new hotfix "fix-shovel" for the tools project group')
                .example(`${cmdName} hotfix publish fix-shovel -g tools`, 'Create a new hotfix "fix-shovel" for the tools project group')
                .example(`${cmdName} hotfix finish fix-shovel -g tools`, 'Finish the hotfix "fix-shovel" for the tools project group')
                .example(`${cmdName} hotfix finish -g tools`, 'Finish the current hotfix for the tools project group')
                .argv;
        },
        handler: Client.runHotfix
    },
    bugfix: {
        command: 'bugfix',
        aliases: ['bf'],
        desc: '[git-flow] Create a new bugfix for the selected group',
        builder: (yargs) => {
            const cmdName = Client.getCLIName(yargs);
            return yargs
                .help('h')
                .alias('h', 'help')
                .demand(1, 'You must provide a valid command')
                .usage(`${cmdName} bugfix <start|publish|finish> <bugfix_name> <bugfix_base> [-g group_name]`)
                .example(`${cmdName} bugfix start fix-shovel -g tools`, 'Create a new bugfix "fix-shovel" for the tools project group')
                .example(`${cmdName} bugfix publish fix-shovel -g tools`, 'Create a new bugfix "fix-shovel" for the tools project group')
                .example(`${cmdName} bugfix finish fix-shovel -g tools`, 'Finish the bugfix "fix-shovel" for the tools project group')
                .example(`${cmdName} bugfix finish -g tools`, 'Finish the current bugfix for the tools project group')
                .argv;
        },
        handler: Client.runBugfix
    },
    support: {
        command: 'support',
        aliases: ['sp'],
        desc: '[git-flow] Create a new support branch for the selected group',
        builder: (yargs) => {
            const cmdName = Client.getCLIName(yargs);
            return yargs
                .help('h')
                .alias('h', 'help')
                .demand(1, 'You must provide a valid command')
                .usage(`${cmdName} support <start|publish|finish> <support_name> [-g group_name]`)
                .example(`${cmdName} support start support-shovel -g tools`, 'Create a new support "support-shovel" for the tools project group')
                .example(`${cmdName} support publish support-shovel -g tools`, 'Create a new support "support-shovel" for the tools project group')
                .example(`${cmdName} support finish support-shovel -g tools`, 'Finish the support "support-shovel" for the tools project group')
                .example(`${cmdName} support finish -g tools`, 'Finish the current support for the tools project group')
                .argv;
        },
        handler: Client.runSupport
    },
};
