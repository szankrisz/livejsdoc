LiveJSDoc
=========

Small JSDoc regenerator utility triggering the creation of a new doc whenever some JS source files change. It monitors a given set of input files and regenerates the documentation in a predefined output directory.

Installation and Usage
----------------------

LiveJSDoc runs on nodejs. It cannot be used as a library, it's just a command-line utility.

First, make sure that JSDoc 3 is installed globally. The current version used 3.3.0-beta1:

	npm install -g jsdoc@"<=3.3.0"

LiveJSDoc expects the 'jsdoc' command to be available, hence the need for the global install.

Afterwards, you can install livejsdoc:

	npm install -g livejsdoc

The list of options can be printed using the 'livejsdoc -h' command. From that point onwards, it's quite self-explanatory.

Mac OS X notes
--------------

On OS X the symlink points directly to 'livejsdoc.js' which contains the shebang line (!#/usr/bin/env node) but is not taken into consideration. You can execute livejsdco as follows:

        node /usr/local/bin/livejsdoc <opts>

Probably my bad :) I really should spend some time in finding out how to instruct npm to generate better symlinks and startup scripts.
