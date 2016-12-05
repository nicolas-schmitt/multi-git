#!/usr/bin/env node
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
require('source-map-support').install();

var _ = require('lodash');
var yargs = require('yargs');

var Manager = _interopRequireDefault(require('../build/manager')).default;
var Client = require('../build/client');

var manager = new Manager();

Client.runCommand(manager, _.get(yargs.argv, '_[0]', ''));
