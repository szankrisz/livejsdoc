#!/usr/bin/env node

// Import modules.
console.log("LiveJSDoc v0.2.1\n");
var fs = require("fs"),
    util = require("util"),
    path = require("path"),
    exec = require("child_process").exec,
    open = require("open");

// Print help, if asked.
function help() {
    console.log("Monitors all JS files within a directory and it's subdirectories and regenerates the JSDoc when a file is edited/added/removed. Requires the 'jsdoc' command to be available.\n");
    console.log("\tlivejsdoc <opts>\n");
    console.log("Options:");
    console.log("\t-h|--help|/?                Print this message and quit.");
    console.log("\t-i|--input <input_dir>      The input directory in which to look for JS files. Cannot be used together with -c or --cordova");
    console.log("\t-c|--cordova                The current directory is searched for an src/main/resources/www subdirectory and if it exists that is set as the input directory.");
    console.log("\t                            Can be used for documenting cordova plugins. Equivalent to: livejsdoc -i ./src/main/resources/www -o ./target/jsdoc");
    console.log("\t-c2|--cordova-dir           Generates a combined JSDoc of cordova plugins found within the current directory. Works as if documentations were generated ");
    console.log("\t                            using 'livejsdoc -c' and then merged into one.");
    console.log("\t-o|--output <output_dir>    The output directory to put the generated JSDoc into. If -c or -c2 is declared then it defaults to ./target/jsdoc");
    console.log("\t-e|--exclude <patterns>     JS regex patterns to exclude. These are applied on the relative paths of files within the input directory.");
    console.log("\t                            Patterns should use forward slash as directory separator and should never start with a slash.");
    console.log("");
}

var arg_1 = process.argv[2];
if (arg_1 == "-h" || arg_1 == "--help" || arg_1 == "/?") {
    help();
    process.exit(0);
}

// Parse arguments.
var in_dirs = [],
    out_dir, exclude_files = [];
var within_arg;
for (var i = 1; i < process.argv.length; i++) {
    var arg = process.argv[i];

    // Process the argument.
    switch (arg) {
        case "-i":
        case "--input":
            if (within_arg)
                break;
            within_arg = "input";
            continue;
        case "-o":
        case "--output":
            if (within_arg)
                break;
            within_arg = "output";
            continue;
        case "-c":
        case "--cordova":
            if (within_arg)
                break;
            else if (in_dirs.length > 0)
                console.log("Omitting " + arg + " as input directory has already been specified.");
            else if (out_dir)
                console.log("Omitting " + arg + " as output directory has already been specified.");
            else {
                var in_dir = path.resolve("./src/main/resources/www");
                if (!fs.existsSync(in_dir)) {
                    console.log("[***] JS source directory of cordova plugin does not exist: " + in_dir);
                    process.exit(1);
                }
                in_dirs.push(in_dir);
                out_dir = path.resolve("./target/jsdoc");
            }
            continue;
        case "-c2":
        case "--cordova-dir":
            if (within_arg)
                break;
            else if (in_dirs.length > 0)
                console.log("Omitting " + arg + " as input directory has already been specified.");
            else if (out_dir)
                console.log("Omitting " + arg + " as output directory has already been specified.");
            else {
                (function(arg) {
                    fs.readdirSync(path.resolve(".")).forEach(function(file, index) {
                        var curPath = path.resolve("./" + file + "/src/main/resources/www");
                        if (fs.existsSync(curPath) && fs.lstatSync(curPath).isDirectory())
                            in_dirs.push(curPath);
                    });
                })(arg);
                out_dir = path.resolve("./target/jsdoc");
            }
            continue;
        case "-e":
        case "--exclude":
            if (within_arg)
                break;
            if (in_dirs.length === 0 || !out_dir) {
                console.log("[***] Exclude must be the last argument, if specified.");
                process.exit(1);
            }
            within_arg = "exclude";
            continue;
    }

    if (within_arg == "input") {
        var in_dir = path.resolve(arg);
        if (!fs.existsSync(in_dir)) {
            console.log("[***] JS source directory does not exist: " + in_dir);
            process.exit(1);
        }
        in_dirs.push(in_dir);
        within_arg = undefined;
    } else if (within_arg == "output") {
        out_dir = path.resolve(arg);
        within_arg = undefined;
    } else if (within_arg == "exclude") {
        try {
            exclude_files.push(new RegExp(arg));
        } catch (e) {
            console.log("[***] Invalid exclude regular expression: " + arg);
            console.log("      " + e);
            process.exit(1);
        }
    }
}

// Check if we've got everything.
if (in_dirs.length === 0) {
    help();
    console.log("[***] Input directory was not specified.");
    process.exit(1);
} else if (!out_dir) {
    help();
    console.log("[***] Output directory was not specified.");
    process.exit(1);
}

in_dirs.forEach(function(in_dir) {
    console.log("Input directory: " + in_dir);
});
console.log("Output directory: " + out_dir);
exclude_files.forEach(function(regex) {
    console.log("Excluding files matching pattern: " + regex.source);
});

// Walks through a directory recursively and reports the set of JS files via the 'done' callback.
function isExcluded(file) {
    if (exclude_files.indexOf(file) >= 0)
        return true;

    return exclude_files.some(function(exclude_file) {
        return in_dirs.some(function(in_dir) {
            var testedPath = path.relative(in_dir, file).replace(/\\/g, '/');
            if (exclude_file.test(testedPath))
                return true;
        });
    });
}

function walk(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
        if (err)
            return done(err);
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file)
                return done(null, results);
            file = path.resolve(dir + "/" + file);
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function(err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else if (/.js$/.test(file) && !isExcluded(file)) {
                    results.push(file);
                    next();
                } else {
                    next();
                }
            });
        })();
    });
}

// Remove directory recursively.
function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function(file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory())
                deleteFolderRecursive(curPath);
            else
                fs.unlinkSync(curPath);
        });
        fs.rmdirSync(path);
    }
}

// Manages public/private mode.
var publicMode = true;

function getModeStr() {
    return publicMode ? "public" : "private";
}

// Performs generation using the files in the source directory.
function generate() {
    var files = [],
        quotedFiles = [],
        n = in_dirs.length;

    function done() {
        if (--n > 0)
            return;

        console.log("[***] Generating JSDoc to output (mode: " + getModeStr() + "). Files: \n\t" + files.join("\n\t"));
        exec("jsdoc " + (!publicMode ? "-p " : "") + "-d \"" + out_dir + "\" " + quotedFiles.join(" "), function(err, out, code) {
            if (err) {
                console.log("[***] Error executing JSDoc. Probably there was a syntax error. Documentation was not regenerated. If the problem persists make sure you have installed JSDoc properly (using 'npm install -g jsdoc')");
                console.log("[***] Exit code: " + code);
                console.log("[***] Error description: " + err);
            }
        });
    }

    in_dirs.forEach(function(in_dir) {
        walk(in_dir, function(err, results) {
            if (err)
                return;

            for (var i = 0; i < results.length; i++) {
                files.push(results[i]);
                quotedFiles.push("\"" + results[i] + "\"");
            }

            done();
        });
    });
}

generate();

// Initialize watching the source directories.
(function() {
    var h;
    in_dirs.forEach(function(in_dir) {
        fs.watch(in_dir, function(evt, dirname) {
            if (!h)
                h = setTimeout(function() {
                    generate();
                    h = undefined;
                }, 250);
        });
    });
})();

// Print some info.
console.log("Commands:");
console.log("- Q to quit.");
console.log("- P to change private/public generation mode.");
console.log("- C to clean the output directory and regenerate the documentation.");
console.log("- O to open the documentation in a browser.");

// Start reading stdin for commands.
var stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf-8");
stdin.on("data", function(key) {
    if (key === "\u0003" || key == "q" || key == "Q")
        process.exit();
    else if (key == "p" || key == "P") {
        publicMode = !publicMode;
        console.log("[***] Switching to " + getModeStr() + " mode.");
        generate();
    } else if (key == "c" || key == "C") {
        console.log("[***] Clearing output directory: " + out_dir);
        deleteFolderRecursive(out_dir);
        generate();
    } else if (key == "o" || key == "O") {
        var indexHtml = path.resolve(out_dir + "/index.html");
        if (!fs.existsSync(indexHtml))
            console.log("[***] Unable to open documentation as it has not yet been generated.");
        else
            open(indexHtml);
    }
});
