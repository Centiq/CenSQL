var readline = require('historic-readline');
var charm = require('charm')(process.stdout);
var colors = require("colors");
var path = require('path');
var async = require('async');
var stripAnsi = require('strip-ansi');
var osHomedir = require('os-homedir');
var StudioSession = require("./studio/StudioSession.js");
var StudioGraphics = require("./studio/StudioGraphics.js");
var CharacterCodeIndex = require("../lib/CharacterCodeIndex.js");
var pkg = require("../package.json");
var updateNotifier = require('update-notifier');
var boxen = require('boxen');

var ScreenManager = function(isBatch, settings, commandHandler) {
    this.isBatch = isBatch;

    this.settings = settings;

    this.cci = new CharacterCodeIndex();

    this.notifier = updateNotifier({
        pkg,
        updateCheckInterval: 1000 * 60 * 60 * 24 * 7 // Check once a week
    });

    /**
     * Info for the prompt. This will be set shortly after connecting to the system.
     * @type {String}
     */
    this.current_schema = "UNKNOWN";
    this.current_username = "UNKNOWN";
    this.current_system_id = "UNKNOWN";
    this.current_database_name = "UNKNOWN";
    this.current_instance_usage = "UNKNOWN";

    this.commandHandler = commandHandler;
}

/**
 * Initialize settings and prepare the screen manager
 */
ScreenManager.prototype.init = function() {
    this.loadDataFormatters();
    this.loadPipeHandlers();

    if (!this.isBatch) {
        this.setupInput();
    }
}

ScreenManager.prototype.loadPipeHandlers = function() {
    this.pipeHandlers = {};
    this.pipeHandlersNames = [];

    this.pipeHandlers["cut"] = require("./pipeCommands/cut.js");
    this.pipeHandlers["grep"] = require("./pipeCommands/grep.js");
    this.pipeHandlers["head"] = require("./pipeCommands/head.js");
    this.pipeHandlers["tail"] = require("./pipeCommands/tail.js");
    this.pipeHandlers["wc"] = require("./pipeCommands/wc.js");
    this.pipeHandlers["tac"] = require("./pipeCommands/tac.js");
    this.pipeHandlers["rev"] = require("./pipeCommands/rev.js");
    this.pipeHandlers["write"] = require("./pipeCommands/write.js");
    this.pipeHandlers["spark"] = require("./pipeCommands/spark.js");
    this.pipeHandlers["line"] = require("./pipeCommands/line.js");

    this.pipeHandlersNames = Object.keys(this.pipeHandlers);

}

ScreenManager.prototype.loadDataFormatters = function() {
    this.formatters = {};

    this.formatters["bar-chart"] = require("./dataFormatters/bar-chart.js");
    this.formatters["bc"] = require("./dataFormatters/bc.js");
    this.formatters["c"] = require("./dataFormatters/c.js");
    this.formatters["csv"] = require("./dataFormatters/csv.js");
    this.formatters["default"] = require("./dataFormatters/default.js");
    this.formatters["g"] = require("./dataFormatters/g.js");
    this.formatters["group"] = require("./dataFormatters/group.js");
    this.formatters["jj"] = require("./dataFormatters/jj.js");
    this.formatters["j"] = require("./dataFormatters/j.js");
    this.formatters["json"] = require("./dataFormatters/json.js");
    this.formatters["key-value-bar-chart"] = require("./dataFormatters/key-value-bar-chart.js");
    this.formatters["kvbc"] = require("./dataFormatters/kvbc.js");
    this.formatters["lg"] = require("./dataFormatters/lg.js");
    this.formatters["line-graph"] = require("./dataFormatters/line-graph.js");
    this.formatters["area-graph"] = require("./dataFormatters/area-graph.js");
    this.formatters["message"] = require("./dataFormatters/message.js");
    this.formatters["m"] = require("./dataFormatters/m.js");
    this.formatters["pretty-json"] = require("./dataFormatters/pretty-json.js");
    this.formatters["table"] = require("./dataFormatters/table.js");
    this.formatters["t"] = require("./dataFormatters/t.js");
    this.formatters["sql-error"] = require("./dataFormatters/sql-error.js");

    this.formattersNames = Object.keys(this.formatters);
}

/**
 * Add an input handler to the cli and pass it to the commandHandler
 */
ScreenManager.prototype.setupInput = function() {

    if (!process.stdout.isTTY) {
        process.stdout.on('error', function(err) {
            if (err.code == "EPIPE") {
                process.exit(0);
            }
        })
        return;
    }

    process.stdin.pause();

    readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        path: path.join(osHomedir(), ".censql", "censql_hist"),
        maxLength: 2000,
        prompt: "NOT SET",
        next: function(rl) {
            this.rl = rl;

            this.rl.on('line', function(line) {

                if (global.censql.RUNNING_PROCESS) return;

                /**
                 * Check terminal width
                 */
                global.censql.graphWidth = process.stdout.columns;

                /**
                 * Stop taking user input until we complete this request
                 */
                process.stdin.pause();

                /**
                 * Save that we already have a running process
                 * @type {Boolean}
                 */
                global.censql.RUNNING_PROCESS = true;

                /**
                 * hide prompt (fixes bug with resizing terminal whilst a command is running)
                 */
                this.rl.setPrompt("");

                /**
                 * Hide user input whilst a command is running (simply pausing stdin still allows scrolling through history)
                 */
                process.stdin._events._keypress_full = process.stdin._events.keypress;
                process.stdin._events.keypress = function(ch, key) {
                    if (key && key.ctrl && key.name == 'c') {
                        global.censql.SHOULD_EXIT = true;
                    }
                };

                /**
                 * Send the user command to the command handler
                 */
                this.commandHandler.handleCommand(line, function(err, output) {

                    if (err) {
                        console.log(err);
                    }

                    this.commandHandler.getActiveSchema(function(err, schema) {
                        if (!err) {
                            /**
                             * Set the active schema
                             * @type {String}
                             */
                            this.current_schema = schema;
                        }

                        /**
                         * Print the command to the screen however the command handler thinks is best
                         */
                        this.printCommandOutput(line, output, function() {

                            /**
                             * Re-enable the command line
                             */
                            process.stdin.resume();

                            /**
                             * Reset running app state
                             * @type {Boolean}
                             */
                            global.censql.RUNNING_PROCESS = false;

                            /**
                             * Should the running process exit?
                             * @type {Boolean}
                             */
                            global.censql.SHOULD_EXIT = false;

                            /**
                             * Reset the keypress function for stdin
                             */
                            process.stdin._events.keypress = process.stdin._events._keypress_full;

                        }.bind(this));

                    }.bind(this));

                }.bind(this));

            }.bind(this));

            /**
             * On close, give the user a pretty message and then stop the entire program
             */
            this.rl.on('close', function() {

                this.print(colors.green('\n\nThanks for using CenSQL!\n'));

                this.rl.close();
                process.exit(0);
            }.bind(this));

            /**
             * When the user ^Cs make sure they weren't just trying to clear the command
             */
            this.rl.on('SIGINT', function() {

                if (global.censql.RUNNING_PROCESS) {
                    global.censql.SHOULD_EXIT = true;
                    return;
                }

                charm.erase("line");
                charm.left(99999);
                charm.up(1);

                /**
                 * Exit command promt
                 */
                this.rl.close();

                /**
                 * Exit program
                 */
                process.exit(0);

            }.bind(this));

        }.bind(this)

    });
}

/**
 * The rest of the program is ready for user input, start listening on stdin
 */
ScreenManager.prototype.ready = function(hdb, username, system_id, db_name, usage, schema) {

    this.clear()

    this.current_username = username;
    this.current_system_id = system_id
    this.current_database_name = db_name;
    this.current_schema = schema;
    this.current_instance_usage = usage;

    /**
     * Should we enter the cli or studio mode?
     */
    if (this.settings.studio) {

        global.censql.graphWidth = process.stdout.columns / 1.5;

        this.graphics = new StudioGraphics(this);
        this.studio = new StudioSession(this, hdb, this.commandHandler);
    } else {

        /**
         * Get width of terminal
         */
        global.censql.graphWidth = process.stdout.columns;

        /**
         * Print header
         */
        this.print(colors.bold(colors.green("CenSQL " + pkg.version) + " - " + colors.cyan("For help enter \\h\n")));
        this.print(colors.grey(new Array(process.stdout.columns + 1).join(this.cci.codes.double_pipe_h)) + "\n")

        /**
         * Print update notification if there is a new version of censql
         */
        if (this.notifier.update) {
            this.print(
                boxen("" + "Update Available:".bold.green + " " +  this.notifier.update.current.green + " -> ".cyan + this.notifier.update.latest.green.bold + "\n" + 
                        "Run: ".cyan.bold + "npm install -g censql".cyan + " to update".cyan.bold, {
                    padding: 1,
                    margin: 1
                }) + "\n");
        }

        /**
         * Start prompt
         */
        this.print(this.getPromptText());
        process.stdin.resume();
    }

}

/**
 * Set settings needed to run without a terminal
 */
ScreenManager.prototype.readyBatch = function() {
    global.censql.graphWidth = 80;
}

ScreenManager.prototype.getPromptText = function() {
    var prompt = "";

    if (this.settings.promptDetail == "full" && this.current_username && this.current_database_name && this.current_instance_usage) {
        prompt = "";
        prompt += (this.current_username == "SYSTEM" ? this.current_username.red : this.current_username.cyan).bold;
        prompt += "@".bold;
        prompt += (this.current_system_id != this.current_database_name ? (this.current_instance_usage == "PRODUCTION" ? this.current_system_id.red : (this.current_instance_usage == "TEST" ? this.current_system_id.yellow : this.current_system_id.green)).bold + ">".green.bold : "");
        prompt += (this.current_instance_usage == "PRODUCTION" ? this.current_database_name.red : (this.current_instance_usage == "TEST" ? this.current_database_name.yellow : this.current_database_name.green)).bold;
        prompt += ":";
        prompt += this.current_schema.cyan;
        prompt += " > ".bold;

    } else if (this.settings.promptDetail == "basic") {
        prompt = this.current_database_name + "> ";
    } else {
        prompt = "> "
    }

    if (!this.settings.colour || this.settings.force_nocolour) {
       prompt = stripAnsi(prompt);
    }

    this.rl.setPrompt(prompt);

    return prompt;
}

/**
 * Print final output to the screen
 */
ScreenManager.prototype.printCommandOutput = function(command, outputs, callback, dontPrintPrompt) {
    this.renderCommandOutput(command, outputs, function(err, lines) {

        this.renderLines([].concat.apply([], lines), function() {

            /**
             * Dont display a prompt for batch requests
             */
            if (!this.isBatch && !dontPrintPrompt) {
                this.print(this.getPromptText());
            }

            callback();

        }.bind(this))

    }.bind(this));
}

/**
 * Print the output to a command entered by the user
 * @param  {String} command The command the user ran
 * @param  {Array} outputs  the data and how to display it
 */
ScreenManager.prototype.renderCommandOutput = function(command, outputs, callback) {

    var cSegs = command.split("||");

    var initialCommand = "";

    /**
     * The parts of the command
     * @type {String[]}
     */
    var cParts = [];

    var hasReachedPipe = false;

    for (var i = 0; i < cSegs.length; i++) {
        var splitOnPipes = cSegs[i].split(/[^\\]\|/);

        // console.log(splitOnPipes)

        if (!hasReachedPipe) {

            if (splitOnPipes.length > 1) {

                hasReachedPipe = true;

                initialCommand += splitOnPipes[0];

                splitOnPipes.shift()

            } else {

                initialCommand += cSegs[i];

                if (i + 1 < cSegs.length) {
                    initialCommand += " || ";
                }

            }
        }

        if (hasReachedPipe) {
            cParts = cParts.concat(splitOnPipes);
        }

    };

    cParts.unshift(initialCommand);

    async.mapSeries(outputs, function(output, callback) {
        /**
         * Pass the data to the chosen formatter
         */
        var lines = this.formatters[output[3]](output[0], output[2], output[4], this, output[5], output[6], output[7]);
        callback(null, this.processPipes(lines, cParts, this.settings));

    }.bind(this), function(err, lines) {

        callback(err, lines);

    }.bind(this))

}

/**
 * Send the data through all the piped commands they added
 */
ScreenManager.prototype.processPipes = function(linesIn, commandParts) {

    var linesOut = linesIn.slice(0);

    for (var j = 1; j < commandParts.length; j++) {

        var commandName = commandParts[j].trim().split(" ")[0].toLowerCase();

        if (!this.pipeHandlers[commandName]) {
            linesOut = ["Unknown command: " + commandName + ". try \\h for help"];
            continue;
        }

        linesOut = this.pipeHandlers[commandName](linesOut, commandParts[j], this)

    }

    return linesOut;

}

/**
 * Draw the data line by line, removing colour if the user requested no colour
 */
ScreenManager.prototype.renderLines = function(lines, callback) {
    async.mapSeries(lines, function(line, callback) {
        this.print(line + "\n", callback);
    }.bind(this), callback ? callback : null);
}

ScreenManager.prototype.error = function(message, callback) {
    this.print(colors.red(message), callback);
}

ScreenManager.prototype.print = function(message, callback) {
    if (!this.settings.colour || this.settings.force_nocolour) {
        process.stdout.write(stripAnsi(message), callback ? callback : null);
    } else {
        process.stdout.write(message, callback ? callback : null);
    }
}

ScreenManager.prototype.clear = function() {
    charm.erase("screen");
    this.goto(1, 1);
}

/**
 * Move the cursor to an x/y cord in the terminal
 */
ScreenManager.prototype.goto = function(x, y) {
    charm.position(x, y);
}

ScreenManager.prototype.move = function(x, y) {
    charm.move(x, y);
}

module.exports = ScreenManager;