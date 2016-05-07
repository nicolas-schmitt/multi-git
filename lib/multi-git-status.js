'use strict';

const _ = require('lodash');

module.exports = class MultiGitStatus {
    get text() {
        let status = 'clean';

        if (this.repository.git.isMerging()) {
            status = 'merging';
        } else if (this.repository.git.isRebasing()) {
            status = 'rebasing';
        } else if (this.repository.git.isReverting()) {
            status = 'reverting';
        } else if (_.some(this.pendingChanges)) {
            status = 'dirty';
        }

        return status;
    }

    constructor(repository) {
        this.repository = repository;
    }
};
