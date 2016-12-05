/* eslint-disable no-console */

import 'colors';
import _ from 'lodash';
import Table from 'cli-table2';
import yargs from 'yargs';

yargs.usage('multi-git <command> [options]')
    .command('status', 'Run git status for the selected project group')
    .command('fetch', 'Run git fetch for the selected project group')
    .command('pull', 'Pull the tracked branch <remote>/<branch> for each project within the group')
    .command('push', 'Push the tracked branch <remote>/<branch> for each project within the group')
    .command('checkout', 'Checkout the same branch for each project within the selected group')
    .command('add', 'Stage one or more files for each project within the selected group')
    .command('unstage', 'Unstage one or more files for each project within the selected group')
    .command('stash', 'Stash changes on each project within the selected group')
    .option('g', {
        alias: 'group',
        type: 'string',
        describe: 'The project group name',
        global: true
    })
    .demand(1, 'must provide a valid command')
    .wrap(Math.min(120, yargs.terminalWidth()));

export function runCommand(manager, command) {
    let argv = {};

    switch (command) {
        case 'status':
            argv = yargs.reset()
                .usage('multi-git status [-g groupName]')
                .help('h')
                .alias('h', 'help')
                .example('multi-git status -g tools', 'Show the status of the tools project group')
                .argv;

            runStatus(manager, argv);
            break;

        case 'fetch':
            argv = yargs.reset()
                .usage('multi-git fetch [-g groupName]')
                .help('h')
                .alias('h', 'help')
                .example('multi-git fetch -g tools', 'Run git fetch on the tools project group')
                .argv;

            runFetch(manager, argv);
            break;

        case 'pull':
            argv = yargs.reset()
                .usage('multi-git pull [remote branch] [-g groupName]')
                .help('h')
                .alias('h', 'help')
                .example('multi-git pull -g tools', 'Run git pull on the tools project group')
                .example('multi-git pull origin master -g tools', 'Run git pull origin master on the tools project group')
                .argv;

            runPull(manager, argv);
            break;

        case 'push':
            argv = yargs.reset()
                .usage('multi-git push [remote branch] [-g groupName]')
                .help('h')
                .alias('h', 'help')
                .example('multi-git push -g tools', 'Run git push on the tools project group')
                .example('multi-git push origin master -g tools', 'Run git push origin master on the tools project group')
                .argv;

            runPush(manager, argv);
            break;

        case 'checkout':
            argv = yargs.reset()
                .usage('multi-git checkout <what> [-g groupName]')
                .demand(2, 'must provide a valid command')
                .help('h')
                .alias('h', 'help')
                .example('multi-git checkout develop -g tools', 'Checkout the branch develop of the tools project group')
                .argv;

            runCheckout(manager, argv);
            break;

        case 'add':
            argv = yargs.reset()
                .usage('multi-git add <what> [-g groupName]')
                .demand(2, 'must provide a valid command')
                .help('h')
                .alias('h', 'help')
                .example('multi-git add axe.js -g tools', 'Stage axe.js for the tools project group')
                .argv;

            runAdd(manager, argv);
            break;

        case 'unstage':
            argv = yargs.reset()
                .usage('multi-git unstage <what> [-g groupName]')
                .demand(2, 'must provide a valid command')
                .help('h')
                .alias('h', 'help')
                .example('multi-git unstage axe.js -g tools', 'Unstage axe.js for the tools project group')
                .argv;

            runUnstage(manager, argv);
            break;

        case 'stash':
            argv = yargs.reset()
                .usage('multi-git stash [pop|drop|apply] [-g groupName]')
                .demand(1, 'must provide a valid command')
                .help('h')
                .alias('h', 'help')
                .example('multi-git stash -g tools', 'Stash staged changes for the tools project group')
                .argv;

            runStash(manager, argv);
            break;

        default:
            yargs.showHelp();
            break;

    }
}

// Commands

export function runStatus(manager, argv) {
    const {group: groupName} = argv;

    return manager
        .getGroup(groupName)
        .then((group) => {
            return group.detailedStatus();
        })
        .then(logStatusTable)
        .done();
}

export function runFetch(manager, argv) {
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
        .then(logStatusTable)
        .done();
}

export function runPull(manager, argv) {
    const {group: groupName} = argv;
    const [, remoteName, branchName,] = _.get(argv, '_', []);

    return manager
        .getGroup(groupName)
        .then((group) => {
            return group.pull(remoteName, branchName);
        })
        .then(logPullTable)
        .done();
}

export function runPush(manager, argv) {
    const {group: groupName} = argv;
    const [, remoteName, branchName,] = _.get(argv, '_', []);

    return manager
        .getGroup(groupName)
        .then((group) => {
            return group.push(remoteName, branchName);
        })
        .then(logSimpleTable)
        .done();
}

export function runCheckout(manager, argv) {
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
        .then(logStatusTable)
        .done();
}

export function runAdd(manager, argv) {
    const {group: groupName} = argv;
    const [, ...files] = _.get(argv, '_', []);
    const scope = {};

    return manager
        .getGroup(groupName)
        .then((group) => {
            scope.group = group;
            return group.addFiles(files);
        })
        .then(logSimpleTable)
        .done();
}

export function runUnstage(manager, argv) {
    const {group: groupName} = argv;
    const [, ...files] = _.get(argv, '_', []);
    const scope = {};

    return manager
        .getGroup(groupName)
        .then((group) => {
            scope.group = group;
            return group.unstageFiles(files);
        })
        .then(logSimpleTable)
        .done();
}

export function runStash(manager, argv) {
    const {group: groupName} = argv;
    const [, ...command] = _.get(argv, '_', []);
    const scope = {};

    return manager
        .getGroup(groupName)
        .then((group) => {
            scope.group = group;
            return group.stash(command);
        })
        .then(logSimpleTable)
        .done();
}

// Output

export function logSimpleTable(result) {
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

export function logPullTable(summaries) {
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

export function logStatusTable(statutes) {
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
