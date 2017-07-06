# Multi Git

A Git command line to manage multiple git repositories at once.

## Intended use
If you ever worked in a micro service environment, you've most likely been asked to worked with dozen of projects.
Keeping them up to date tends to be tedious.

This module aims to replace this :
````bash
$ cd group/project1
$ git pull
$ cd ../project2
$ git pull
$ cd ../project3
$ git pull
$ cd ../project4
$ git pull
$ cd ../project5
$ git pull
...
````
by that :
````bash
$ cd group
$ multi-git pull
````

same goes for status, fetch ...

## Configuration
multi-git will try to read its configuration file from multiple locations in the following order:
1. the current working directory
2. the home directory
3. the module directory (which will most likely serve as default values)

This file must be named `.mg-config.json` and be in `json` format.

````json
{
    "defaultToProject": false,
    "defaultGroupSettings": {
        "allowEmptyRelease": true
    },
    "projects": {
        "repo1": {
            "name": "repo1",
            "path": "/home/ubuntu/workspace/repos/repo1"
        },
        "repo2": {
            "name": "repo2",
            "path": "/home/ubuntu/workspace/repos/repo2"
        },
        "repo3": {
            "name": "repo3",
            "path": "/home/ubuntu/workspace/repos/repo3"
        }
    },
    "groups": {
        "awesome-group": {
            "name": "awesome-group",
            "allowEmptyRelease": false,
            "members": [
                "repo1",
                "repo2"
            ]
        },
        "magnificent-group": {
            "name": "magnificent-group",
            "members": [
                "repo2",
                "repo3"
            ]
        }
    }
}
````

* Paths can be absolute or relative.
    * If relative, they will be resolved from the current working directory.
* Paths can contain ~
* A project can belong to multiple groups

#### About allowEmptyRelease
By default, if you attemp to run *multi-git release start* on a group,
it will run *git flow release start* for each project, wether or not develop is ahead of master.
Wich means you could create empty release.
A group with *allowEmptyRelease* set to *false*, will skip such directories.

## Available commands

````bash
$ multi-git -h
multi-git <command> [options]

Commands:
  status    Run git status for the selected project group                                                [aliases: st]
  fetch     Run git fetch for the selected project group                                                 [aliases: fe]
  pull      Pull the tracked branch <remote>/<branch> for each project within the group                  [aliases: pl]
  push      Push the tracked branch <remote>/<branch> for each project within the group                  [aliases: ps]
  checkout  Checkout the same branch for each project within the selected group                          [aliases: co]
  add       Stage one or more files for each project within the selected group                            [aliases: a]
  unstage   Unstage one or more files for each project within the selected group
  stash     Stash changes on each project within the selected group
  feature   [git-flow] Create a new feature for the selected group                                       [aliases: ft]
  release   [git-flow] Create a new version for the selected group                                       [aliases: rl]
  hotfix    [git-flow] Create a new hotfix for the selected group                                        [aliases: hf]
  bugfix    [git-flow] Create a new bugfix for the selected group                                        [aliases: bf]
  support   [git-flow] Create a new support branch for the selected group                                [aliases: sp]

Options:
  -g, --group  The project group name
  -p, --project  The project name
````

Behaviour
-------------------------------------------------------------------
You can use multi-git:
* with the _--group_ flag: In that case multi-git will try to find the group by its name in the configuration file
and run the specified command on each group member.
* with the _--project_ flag: In that case multi-git will try to find the project by its name in the configuration file
and run the specified command.
* without either of those:
    * if ````config.defaultToProject === true````: multi-git will run the specified command in the current working
    directory, just like git would.
    * otherwise:
        * if the current working directory is a git repository, multi-git will run the specified command on each member
        of each group the cwd belongs ;
        * if not, it will run the command on each subdirectories of the cwd.

Want to contribute?
-------------------------------------------------------------------
Any idea to improve this project would be greatly appreciated.
Feel free to submit your [pull request](https://github.com/nicolas-schmitt/multi-git/pulls).
