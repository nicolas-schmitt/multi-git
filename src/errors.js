export class DirtyRepositoryError extends Error {
    constructor(message = 'The repository was dirty') {
        super(message);

        this.code = 'dirty-repo';
    }
}

export class NoPackageError extends Error {
    constructor(message = 'There is no package file') {
        super(message);

        this.code = 'no-package';
    }
}

export class NoActiveReleaseError extends Error {
    constructor(message = 'There is no active release') {
        super(message);

        this.code = 'no-active-release';
    }
}

export class ActiveReleaseError extends Error {
    constructor(message = 'There is already one active release') {
        super(message);

        this.code = 'active-release';
    }
}

export class MultipleActiveReleaseError extends Error {
    constructor(message = 'There are more than one active release') {
        super(message);

        this.code = 'multiple-active-release';
    }
}

export class NoConfigFileError extends Error {
    constructor(message = 'There is no configuration file') {
        super(message);

        this.code = 'no-config-file';
    }
}

export class GroupMissingError extends Error {
    constructor(message = 'Requested group is missing') {
        super(message);

        this.code = 'group-missing';
    }
}

export class ChainBreaker extends Error {
    constructor(message = 'This promise chain has been terminated early') {
        super(message);

        this.code = 'chain-breaker';
    }
}

export class AheadRepositoryError extends Error {
    constructor(message = 'The repository is ahead its remote') {
        super(message);

        this.code = 'ahead-repo';
    }
}

export class BehindRepositoryError extends Error {
    constructor(message = 'The repository is behind its remote') {
        super(message);

        this.code = 'behind-repo';
    }
}

export class InvalidVersionError extends Error {
    constructor(message = `This isn't a valid version`) {
        super(message);

        this.code = 'invalid-version';
    }
}

export class InvalidFeatureBranchError extends Error {
    constructor(message = `The current branch isn't a feature`) {
        super(message);

        this.code = 'invalid-feature';
    }
}

export class InvalidSupportBranchError extends Error {
    constructor(message = `The current branch isn't a support branch`) {
        super(message);

        this.code = 'invalid-support';
    }
}
