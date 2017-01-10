Multi Git
========

A Git command line to manage multiple git repositories at once.

What's new ?
-------------------------------------------------------------------
* nodegit has been dropped in favor of simple-git. That way, you won't have to compile any dependency.
* Most common git commands are now supported.
* multi-git can be used from any directory, even if it's not listed in your configuration file.


Intended use
-------------------------------------------------------------------

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
````javascript
$ cd group
$ multi-git pull
````

same goes for status, fetch ...

Configuration
-------------------------------------------------------------------
multi-git will try to read its configuration file from multiple locations in the following order:
1. the current working directory
2. the home directory
3. the module directory (which will most likely serve as default values)

This file must be named `.mg-config.json` and be in `json` format.

````json
{
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

* Paths must be absolute
* Paths can contain ~
* A project can belong to multiple groups

Available commands
-------------------------------------------------------------------
````bash
$ multi-git -h
Commands:
  status    Run git status for the selected project group
  fetch     Run git fetch for the selected project group
  pull      Pull the tracked branch <remote>/<branch> for each project within the group
  push      Push the tracked branch <remote>/<branch> for each project within the group
  checkout  Checkout the same branch for each project within the selected group
  add       Stage one or more files for each project within the selected group
  unstage   Unstage one or more files for each project within the selected group
  stash     Stash changes on each project within the selected group
  feature   [git-flow] Create a new feature for the selected group
  release   [git-flow] Create a new version for the selected group

Options:
  -g, --group  The project group name
````

Behaviour
-------------------------------------------------------------------
You can use multi-git with the _--group_ flag:
In that case multi-git will try to find the group by its name in the configuration file
and run the specified command on each group member.

or without:
In that case multi-git, if the current working directory is a git repository,
multi-git will run the specified command on each member of each group the cwd belongs ;
if not, it will run the command on each subdirectories of the cwd.

Want to contribute?
-------------------------------------------------------------------
Any idea to improve this project would be greatly appreciated.
Feel free to submit your [pull request](https://github.com/nicolas-schmitt/multi-git/pulls).
