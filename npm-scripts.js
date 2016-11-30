'use strict';

var action = process.argv[2];
var argv = process.argv.slice(3);
var valet = require('./src/valet');

switch (action) {
    case 'install':
        valet.helpInstall(argv);
        break;

    default:
        console.warn('unknown action');
        break;
}
