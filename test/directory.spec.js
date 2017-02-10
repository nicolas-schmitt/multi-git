import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import spies from 'chai-spies';
import fs from 'fs';
import mockfs from 'mock-fs';
import path from 'path';
import childProcess from 'child_process';
import { expect } from 'chai';

import Directory from '../src/directory';

chai.use(chaiAsPromised);
chai.use(spies);
const mockTree = {
    '/projects': {
        shovel: {
            '.git': {},
            'README.md': '# shovel',
        },
        rake: {
            '.git': {},
            'README.md': '# rake',
        },
        pick: {
            'README.md': '# pick',
        },
    },
};

describe('Directory', () => {
    before(function() {
        mockfs(mockTree);
        this.spawn = childProcess.spawn;
    });

    beforeEach(function() {
        this.spawnSpy = chai.spy(childProcess.spawn);
        childProcess.spawn = this.spawnSpy;
    });

    describe('ctor', () => {
        it('should set this.path & this.name to cwd when called with no argument', () => {
            const expectedPath = process.cwd();
            const dir = new Directory();

            expect(dir.path).to.equal(expectedPath);
            expect(dir.name).to.equal(path.basename(expectedPath));
        });

        it('should set this.path to the first argument when called with a single string', () => {
            const expectedPath = './test';
            const dir = new Directory(expectedPath);

            expect(dir.path).to.equal(expectedPath);
            expect(dir.name).to.equal(path.basename(expectedPath));
        });

        it('should set this.path & this.name to the first argument path & name properties when called with a single object', () => {
            const expected = {
                path: './test',
                name: 'test'
            };
            const dir = new Directory(expected);

            expect(dir.path).to.equal(expected.path);
            expect(dir.name).to.equal(expected.name);
        });

        it('should set this.path to the first argument & this.name to the second when called whith 2 arguments', () => {
            const expectedPath = './test';
            const expectedName = 'peon';
            const dir = new Directory(expectedPath, expectedName);

            expect(dir.path).to.equal(expectedPath);
            expect(dir.name).to.equal(expectedName);
        });
    });

    describe('hasGit', () => {
        it('should eventually return true if the current directory is a git repository', () => {
            const dir = new Directory('/projects/shovel');
            return expect(dir.hasGit()).to.eventually.equal(true);
        });

        it('should eventually return false if the current directory is not a git repository', () => {
            const dir = new Directory('/projects/pick');
            return expect(dir.hasGit()).to.eventually.equal(false);
        });
    });

    describe('status', () => {
        it('should call git status', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.status().catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['status', '--porcelain', '-b']);
        });
    });

    describe('fetch', () => {
        it('should call git fetch', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.fetch().catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['fetch']);
        });
    });

    describe('checkout', () => {
        it('should call git checkout', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.checkout('iron').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['checkout', 'iron']);
        });
    });

    describe('commit', () => {
        it('should call git commit', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.commit('solid message').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['commit', '-m', 'solid message']);
        });
    });

    describe('branch', () => {
        it('should call git branch', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.branch().catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['branch']);
        });
    });

    describe('deleteBranch', () => {
        it('should call git branch -d', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.deleteBranch('iron').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['branch', '-d', 'iron']);
        });
    });

    describe('createBranch', () => {
        it('should call git checkout -b', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.createBranch('iron').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['checkout', '-b', 'iron']);
        });
    });

    describe('push', () => {
        it('should call git push', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.push('origin', 'develop').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['push', 'origin', 'develop']);
        });

        it('shouldn\'t call git push undefined undefined when called without argument', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.push().catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['push']);
        });
    });

    describe('pushTags', () => {
        it('should call git push --tags', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.pushTags('origin').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['push', 'origin', '--tags']);
        });

        it('shouldn\'t call git push undefined --tags when called without argument', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.pushTags().catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['push', '--tags']);
        });
    });

    describe('pull', () => {
        it('should call git pull', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.pull().catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['pull']);
        });

        it('shouldn\'t call git pull undefined undefined when called without argument', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.pull().catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['pull']);
        });
    });

    describe('mergeFromTo', () => {
        it('should call git merge', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.mergeFromTo('master', 'develop').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['merge', 'master', 'develop']);
        });
    });

    describe('tag', () => {
        it('should call git tag -a -m', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.tag('1.0.0', 'Finish 1.0.0').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['tag', '-a', '-m', 'Finish 1.0.0', '1.0.0']);
        });
    });

    describe('addFiles', () => {
        it('should call git add', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.addFiles('package.json').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['add', 'package.json']);
        });

        it('should call git add ...arguments[0] when called with an array', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.addFiles(['package.json', 'README.md']).catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['add', 'package.json', 'README.md']);
        });
    });

    describe('reset', () => {
        it('should call git reset', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.reset().catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['reset']);
        });
    });

    describe('stash', () => {
        it('should call git stash', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.stash().catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['stash']);
        });
    });

    describe('featureStart', () => {
        it('should call git flow feature start', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.featureStart('add-shaft').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'feature', 'start', 'add-shaft']);
        });

        it('should call git flow feature start base when called with 2 arguments', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.featureStart('add-shaft', '1234567').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'feature', 'start', 'add-shaft', '1234567']);
        });
    });

    describe('featurePublish', () => {
        it('should call git flow feature publish', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.featurePublish('add-shaft').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'feature', 'publish', 'add-shaft']);
        });
    });

    describe('featureFinish', () => {
        it('should call git flow feature finish', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.featureFinish('add-shaft').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'feature', 'finish', 'add-shaft']);
        });
    });

    describe('releaseStart', () => {
        it('should call git flow release start', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.releaseStart('add-shaft').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'release', 'start', 'add-shaft']);
        });

        it('should call git flow release start base when called with 2 arguments', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.releaseStart('add-shaft', '1234567').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'release', 'start', 'add-shaft', '1234567']);
        });
    });

    describe('releasePublish', () => {
        it('should call git flow release publish', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.releasePublish('add-shaft').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'release', 'publish', 'add-shaft']);
        });
    });

    describe('releaseFinish', () => {
        it('should call git flow release finish', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.releaseFinish('add-shaft').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'release', 'finish', 'add-shaft', '-m', 'Finish']);
        });
    });

    describe('hotfixStart', () => {
        it('should call git flow hotfix start', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.hotfixStart('add-shaft').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'hotfix', 'start', 'add-shaft']);
        });

        it('should call git flow hotfix start base when called with 2 arguments', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.hotfixStart('add-shaft', '1234567').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'hotfix', 'start', 'add-shaft', '1234567']);
        });
    });

    describe('hotfixPublish', () => {
        it('should call git flow hotfix publish', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.hotfixPublish('add-shaft').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'hotfix', 'publish', 'add-shaft']);
        });
    });

    describe('hotfixFinish', () => {
        it('should call git flow hotfix finish', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.hotfixFinish('add-shaft').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'hotfix', 'finish', 'add-shaft', '-m', 'Finish']);
        });
    });

    describe('bugfixStart', () => {
        it('should call git flow bugfix start', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.bugfixStart('add-shaft').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'bugfix', 'start', 'add-shaft']);
        });

        it('should call git flow bugfix start base when called with 2 arguments', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.bugfixStart('add-shaft', '1234567').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'bugfix', 'start', 'add-shaft', '1234567']);
        });
    });

    describe('bugfixPublish', () => {
        it('should call git flow bugfix publish', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.bugfixPublish('add-shaft').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'bugfix', 'publish', 'add-shaft']);
        });
    });

    describe('bugfixFinish', () => {
        it('should call git flow bugfix finish', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.bugfixFinish('add-shaft').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'bugfix', 'finish', 'add-shaft', '-m', 'Finish']);
        });
    });

    describe('supportStart', () => {
        it('should call git flow support start', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.supportStart('add-shaft').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'support', 'start', 'add-shaft']);
        });

        it('should call git flow support start base when called with 2 arguments', function() {
            const dir = new Directory('/projects/shovel');
            dir.loadGit();
            dir.supportStart('add-shaft', '1234567').catch(() => {});

            expect(this.spawnSpy).to.have.been.called.with('git', ['flow', 'support', 'start', 'add-shaft', '1234567']);
        });
    });

    describe('supportPublish', () => {
        it('should call git flow support publish', function() {
            const dir = new Directory('/projects/shovel');

            dir.push = (remote, branch) => { return Promise.resolve([remote, branch]); };
            dir.config = () => { return Promise.resolve({gitflow: {prefix: {support: 'support/'}}}); };
            dir.status = () => { return Promise.resolve(); };
            dir.getDefaultRemote = () => { return 'origin'; };

            dir.loadGit();
            const result = dir.supportPublish('add-shaft').catch(() => {});

            return expect(result).to.eventually.have.members(['origin', 'support/add-shaft']);
        });
    });

    after(function() {
        childProcess.spawn = this.spawn;
        mockfs.restore();
    });
});
