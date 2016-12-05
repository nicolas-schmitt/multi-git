'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
require('source-map-support').install();

var action = process.argv[2];
var argv = process.argv.slice(3);
var valet = _interopRequireDefault(require('./build/valet')).default;

switch (action) {
    case 'install':
        valet.helpInstall(argv);
        break;

    default:
        console.warn('unknown action');
        break;
}
