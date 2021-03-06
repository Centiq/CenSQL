var colors = require("colors");

module.exports = function(command, data, title, screen) {

    var lines = [];

    var barTypes = [screen.cci.codes.block_whole, screen.cci.codes.block_faded_min, screen.cci.codes.block_faded_mid, screen.cci.codes.block_faded_max]

    var ccolours = ['cyan', 'green', 'red', 'yellow', 'blue', 'magenta'];

    var parts = [];

    /**
     * get keys
     */
    var keys = [];

    if (data.length > 0) {

        keys = Object.keys(data[0]);
    } else {
        lines.push("No Results");
        lines.push("");
        return lines;
    }

    /**
     * Get sections
     */

    var sections = [];

    for (var k = 0; k < data.length; k++) {

        if (sections.indexOf(data[k][keys[0]]) === -1) {
            sections.push(data[k][keys[0]]);
        }

    }

    sections.sort();

    for (var s = 0; s < sections.length; s++) {

        var sum = 0;

        for (var k = 0; k < data.length; k++) {

            if (data[k][keys[0]] !== sections[s]) continue;

            sum += data[k][keys[2]]

            if (parts.indexOf(data[k][keys[1]]) === -1) {
                parts.push(data[k][keys[1]])
            }

        }

        lines.push(colors.white(title + " - " + sections[s]))

        for (var q = 0; q < screen.settings.barHeight; q++) {
            var dataLine = "";

            for (var k = 0; k < data.length; k++) {

                if (data[k][keys[0]] !== sections[s]) continue;

                var width = Math.floor(global.censql.graphWidth * data[k][keys[2]] / sum);

                dataLine += colors[ccolours[parts.indexOf(data[k][keys[1]])]](new Array(width).join(barTypes[parts.indexOf(data[k][keys[1]]) % 4]));

            }

            lines.push(dataLine);
        }

        lines.push("");

    }

    for (var k = 0; k < parts.length; k++) {

        if(parts[k] == "hidden") continue;

        lines.push("- " + colors[ccolours[k]](parts[k]))
    }

    return lines;
}