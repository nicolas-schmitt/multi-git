Multi Git
========

A Git command line to manage multiple git repositories at once.

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
multi-git will try to read its configuration file where it's beeing executed.

This file must be named `.multigitconfig` and be in `json` format.

````json
{
    "repositories": [
        "./group/*",
        "./some/isolated/path"
    ]
}
````

Available commands
-------------------------------------------------------------------
````bash
$ multi-git -h
Commands:
  status  Run git status
  fetch   Run git fetch
  pull    Run git pull

Options:
  -h, --help  Show help                                                [boolean]

$ multi-git pull -h
multi-git pull

Options:
  -h, --help  Show help                                                [boolean]
  --rebase                                            [boolean] [default: false]
````

FAQ
-------------------------------------------------------------------
This module depends on [nodegit](https://www.npmjs.com/package/nodegit) and might throw some errors about libstdc++.
If that's the case, please refer to their [README](https://www.npmjs.com/package/nodegit#getting-started).


Roadmap
-------------------------------------------------------------------
* [x] git status
* [x] git fetch
* [x] git pull
* [x] git pull --rebase
* [ ] read actual git configuration
* [ ] handle missing configuration file
* [ ] improve error handling and display more information about a pull (commits downloaded)
* [ ] allow more detailed configuration (repository name, prefix, pull strategy ...)
* [ ] npm init like for .multigitconfig
* [ ] interactive mode
* [ ] branch creation
