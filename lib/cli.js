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
            .catch(error => {
                console.error(error);
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

    _.forEach(repositories, (repo) => {
        table.push([
            repo.name,
            _.some(repo.status.pendingChanges) ? 'dirty'.red : 'clean'.green,
            repo.status.branch,
            repo.status.upstream,
            repo.status.ahead,
            repo.status.behind
        ]);
    });

    console.log(table.toString());
}
