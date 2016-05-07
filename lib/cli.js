'use strict';

require('colors');
const _ = require('lodash');
const yargs = require('yargs');
const Table = require('cli-table2');
const MultiGit= require('./multi-git');

let mg = new MultiGit();

module.exports = yargs
    .command('status', 'Run git status', {}, (argv) => {
        mg.loadRepositories()
            .then(() => {
                return mg.status();
            })
            .then(logStatusTable)
            .catch((err) => {
                console.error('[Multi-Git]', err);
            });
    })
    .command('fetch', 'Run git fetch', {}, (argv) => {
        mg.loadRepositories()
            .then(() => {
                return mg.fetch();
            })
            .then(() => {
                return mg.status();
            })
            .then(logStatusTable)
            .catch((err) => {
                console.error('[Multi-Git]', err);
            });
    })
    .command(
        'pull',
        'Run git pull',
        (argv) => {
            return yargs.option('rebase', {default: false, type: 'boolean'});
        },
        (argv) => {
            mg.loadRepositories()
            .then(() => {
                return mg.pull(argv.rebase);
            })
            .then(() => {
                return mg.status();
            })
            .then(logStatusTable)
            .catch((err) => {
                console.error('[Multi-Git]', err);
            });
    })
    .help('h')
    .alias('h', 'help')
    .argv;

function logStatusTable(repositories) {
    repositories = _.without(repositories, undefined);

    let table = new Table({
        head: ['', 'status'.cyan, 'branch'.cyan, 'upstream'.cyan, 'ahead'.cyan, 'behind'.cyan],
        style: {
            head: []
        }
    });

    _.forEach(repositories, (repository) => {
        table.push([
            repository.name,
            repository.status.text === 'clean' ? repository.status.text.green : repository.status.text.red,
            repository.status.branch,
            repository.status.upstream,
            repository.status.ahead,
            repository.status.behind
        ]);
    });

    console.log(table.toString());
}
