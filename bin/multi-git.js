#!/usr/bin/env node
'use strict';

require('source-map-support').install();

var _ = require('lodash');
var yargs = require('yargs');

var Manager = require('../build/manager');
var Client = require('../build/client');

var manager = new Manager();

Client.runCommand(manager, _.get(yargs.argv, '_[0]', ''));
