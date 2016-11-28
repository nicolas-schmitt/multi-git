'use strict';

const {
    runCommand,
    runStatus,
    runFetch,
    runPull,
    runPush,
    runCheckout,
    runAdd,
    runUnstage,
    runStash,
    logSimpleTable,
    logPullTable,
    logStatusTable,
} = require('./client');

module.exports = {
    Directory: require('./directory'),
    Group: require('./group'),
    Manager: require('./manager'),
    runCommand,
    runStatus,
    runFetch,
    runPull,
    runPush,
    runCheckout,
    runAdd,
    runUnstage,
    runStash,
    logSimpleTable,
    logPullTable,
    logStatusTable,
};
