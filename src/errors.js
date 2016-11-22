'use strict';

class DirtyRepositoryError extends Error {
    constructor(message = 'The repository was dirty') {
        super(message);

        this.code = 'dirty-repo';
    }
}

class NoPackageError extends Error {
    constructor(message = 'There is no package file') {
        super(message);

        this.code = 'no-package';
    }
}

class NoActiveReleaseError extends Error {
    constructor(message = 'There is no active release') {
        super(message);

        this.code = 'no-active-release';
    }
}

class ActiveReleaseError extends Error {
    constructor(message = 'There is already one active release') {
        super(message);

        this.code = 'active-release';
    }
}

class MultipleActiveReleaseError extends Error {
    constructor(message = 'There are more than one active release') {
        super(message);

        this.code = 'multiple-active-release';
    }
}

class NoConfigFileError extends Error {
    constructor(message = 'There is no configuration file') {
        super(message);

        this.code = 'no-config-file';
    }
}

class GroupMissingError extends Error {
    constructor(message = 'Requested group is missing') {
        super(message);

        this.code = 'group-missing';
    }
}

class ChainBreaker extends Error {
    constructor(message = 'This promise chain has been terminated early') {
        super(message);

        this.code = 'chain-breaker';
    }
}

module.exports = {
    ActiveReleaseError,
    ChainBreaker,
    DirtyRepositoryError,
    GroupMissingError,
    MultipleActiveReleaseError,
    NoActiveReleaseError,
    NoConfigFileError,
    NoPackageError,
};
