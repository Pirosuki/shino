const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("uptime")
        .setDescription("Shows shino's uptime"),

    async execute(interaction) {
        // Grabs uptime in seconds from process
        var uptime = process.uptime() + 7200;

        // Formats uptime into a string, calling the formatTime function while doing so.
        var uptimeForm = "shino has been running for " + formatTime(uptime) + ".";

        // Sends the result to the caller
        await interaction.reply(uptimeForm);

        // Logs event
        console.log("[" + interaction.guild.name + "] " + interaction.user.tag + " checked shino's uptime.");
    },
};

// Function for formatting seconds into hours, minutes and seconds
function formatTime(uptime) {
    // Defines variable for final value
    let uptimeFormatted;

    // Round down to reduce frustration when the script decides not to work
    uptime = Math.round(uptime);
    
    // Extract hours
    let hours = Math.floor(uptime / 3600);
    if (hours) {
        hours = hours + " hours";
    }

    // Extract minutes
    let minutes = Math.floor(uptime % 3600 / 60);
    if (minutes) {
        minutes = minutes + " minutes";
    }

    // Extract seconds
    let seconds = uptime % 60;
    if (seconds) {
        seconds = seconds + " seconds";
    }

    // Filters out empty values
    let uptimeValues = [hours, minutes, seconds].filter(Boolean);
    
    // Formats into a more readable string
    if (uptimeValues.length > 1) {
        // Separates all values with ", " except the last one who instead gets " and "
        uptimeFormatted = uptimeValues.slice(0, -1).join(', ') + " and " + uptimeValues.slice(-1);
    }
    else {
        // If there's only one value then it just gets thrown in there
        uptimeFormatted = uptimeValues;
    }
    
    // Returns string to caller
    return uptimeFormatted;
}