/* eslint-disable no-console */

import 'colors';
import _ from 'lodash';
import Table from 'cli-table2';
import yargs from 'yargs';
import Manager from './manager';

let defaultCommandList;

/**
 * Represents the multi-git client. Handles the prompt.
 * @constructor
 * @param {object} manager - a multi-git manager
 */
export default class Client {
    constructor(manager) {
        this.commandList = defaultCommandList;
        this.manager = manager || new Manager();

        yargs.usage('multi-git <command> [options]')
            .option('g', {
                alias: 'group',
                type: 'string',
                describe: 'The project group name',
                global: true
            })
            .demand(1, 'must provide a valid command')
            .wrap(Math.min(120, yargs.terminalWidth()));

        this.loadCommandList();
    }

    /**
     * Load the command list into yargs
     */
    loadCommandList() {
        _.forEach(this.commandList, (command) => {
            yargs.command(command.name, command.description);
        });
    }

    /**
     * Set a new command or update an existing one
     * @param {string} name - the command name
     * @param {string} description - the command description
     * @param {function} prompt - a custom prompt for the command (ex -h)
     * @param {function} handler - the command handler
     */
    setCommand(name, description, prompt, handler) {
        yargs.command(name, description);
        this.commandList[name] = {name, description, prompt, handler};
    }

    /**
     * Set or update multiple commands
     * @param {array} commands - an array of command
     */
    setCommands(commands) {
        _.forEach(commands, (command) => {
            this.setCommand(command.name, command.description, command.prompt, command.handler);
        });
    }

    /**
     * Parse the process argv and run a command accordingly
     */
    runPromptCommand() {
        this.runCommand(_.get(yargs.argv, '_[0]', ''));
    }

    /**
     * Run the requested command or show the help
     * @param {string} name - the command name
     */
    runCommand(name) {
        if (this.commandList[name]) {
            const command = this.commandList[name];
            const argv = command.prompt();
            command.handler(this.manager, argv);
        } else {
            yargs.showHelp();
        }
    }

    //region Command handlers
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
    //endregion

    //region Output
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
}

defaultCommandList = {
    status: {
        name: 'status',
        description: 'Run git status for the selected project group',
        prompt: () => {
            return yargs.reset()
                .usage('multi-git status [-g groupName]')
                .help('h')
                .alias('h', 'help')
                .example('multi-git status -g tools', 'Show the status of the tools project group')
                .argv;
        },
        handler: Client.runStatus
    },
    fetch: {
        name: 'fetch',
        description: 'Run git fetch for the selected project group',
        prompt: () => {
            return yargs.reset()
                .usage('multi-git fetch [-g groupName]')
                .help('h')
                .alias('h', 'help')
                .example('multi-git fetch -g tools', 'Run git fetch on the tools project group')
                .argv;
        },
        handler: Client.runFetch
    },
    pull: {
        name: 'pull',
        description: 'Pull the tracked branch <remote>/<branch> for each project within the group',
        prompt: () => {
            return yargs.reset()
                .usage('multi-git pull [remote branch] [-g groupName]')
                .help('h')
                .alias('h', 'help')
                .example('multi-git pull -g tools', 'Run git pull on the tools project group')
                .example('multi-git pull origin master -g tools', 'Run git pull origin master on the tools project group')
                .argv;
        },
        handler: Client.runPull
    },
    push: {
        name: 'push',
        description: 'Push the tracked branch <remote>/<branch> for each project within the group',
        prompt: () => {
            return yargs.reset()
                .usage('multi-git push [remote branch] [-g groupName]')
                .help('h')
                .alias('h', 'help')
                .example('multi-git push -g tools', 'Run git push on the tools project group')
                .example('multi-git push origin master -g tools', 'Run git push origin master on the tools project group')
                .argv;
        },
        handler: Client.runPush
    },
    checkout: {
        name: 'checkout',
        description: 'Checkout the same branch for each project within the selected group',
        prompt: () => {
            return yargs.reset()
                .usage('multi-git checkout <what> [-g groupName]')
                .demand(2, 'must provide a valid command')
                .help('h')
                .alias('h', 'help')
                .example('multi-git checkout develop -g tools', 'Checkout the branch develop of the tools project group')
                .argv;
        },
        handler: Client.runCheckout
    },
    add: {
        name: 'add',
        description: 'Stage one or more files for each project within the selected group',
        prompt: () => {
            return yargs.reset()
                .usage('multi-git add <what> [-g groupName]')
                .demand(2, 'must provide a valid command')
                .help('h')
                .alias('h', 'help')
                .example('multi-git add axe.js -g tools', 'Stage axe.js for the tools project group')
                .argv;
        },
        handler: Client.runAdd
    },
    unstage: {
        name: 'unstage',
        description: 'Unstage one or more files for each project within the selected group',
        prompt: () => {
            return yargs.reset()
                .usage('multi-git unstage <what> [-g groupName]')
                .demand(2, 'must provide a valid command')
                .help('h')
                .alias('h', 'help')
                .example('multi-git unstage axe.js -g tools', 'Unstage axe.js for the tools project group')
                .argv;
        },
        handler: Client.runUnstage
    },
    stash: {
        name: 'stash',
        description: 'Stash changes on each project within the selected group',
        prompt: () => {
            return yargs.reset()
                .usage('multi-git stash [pop|drop|apply] [-g groupName]')
                .demand(1, 'must provide a valid command')
                .help('h')
                .alias('h', 'help')
                .example('multi-git stash -g tools', 'Stash staged changes for the tools project group')
                .argv;
        },
        handler: Client.runStash
    },
};
