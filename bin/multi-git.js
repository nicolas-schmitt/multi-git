#!/usr/bin/env node
'use strict';

const _ = require('lodash');
const yargs = require('yargs');

const Manager = require('../src/manager');
const {runCommand} = require('../src/client');

const manager = new Manager();

runCommand(manager, _.get(yargs.argv, '_[0]', ''));
