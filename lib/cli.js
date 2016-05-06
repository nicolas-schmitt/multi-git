'use strict';

require('colors');
const _ = require('lodash');
const yargs = require('yargs');
const Table = require('cli-table2');
const MultiGit= require('./multi-git');

let mg = new MultiGit();

module.exports = yargs
    .command('status', 'runs git status', {}, function (argv) {
        mg.loadRepositories()
            .then(() => {
                return mg.status();
            })
            .then(logStatusTable)
            .catch((err) => {
                console.error('[Multi-Git]', err);
            });
    })
    .command('fetch', 'runs git fetch', {}, function (argv) {
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
    .command('pull', 'runs git pull', {}, function (argv) {
        mg.loadRepositories()
            .then(() => {
                return mg.pull();
            })
            .then(() => {
                return mg.status();
            })
            .then(logStatusTable)
            .catch((err) => {
                console.error('[Multi-Git]', err);
            });
    })
    .help()
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
