const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("uptime")
        .setDescription("Shows shino's uptime"),

    async execute(interaction) {
        var uptime = process.uptime();
        var uptimeForm = "shino has been running for " + formatTime(uptime);
        await interaction.reply(uptimeForm);

        console.log("[" + interaction.guild.name + "] " + "Sent shino's uptime to " + interaction.user.tag);
    },
};

function formatTime(uptime) {
    uptime = Math.round(uptime)
    var seconds, minutes, hours;
    seconds = minutes = hours = "";

    if (uptime < 60) {
        seconds = Math.floor(uptime % 60) + " second(s).";
    }
    else if (uptime < (60 * 60)) {
        minutes = Math.floor(uptime / 60) + " minute(s) and ";
        seconds = Math.floor(uptime % 60) + " second(s).";
    }
    else {
        hours = Math.floor(uptime / (60 * 60)) + " hour(s), "
        minutes = Math.floor((uptime % (60 * 60)) / 60) + " minute(s), ";
        seconds = Math.floor((uptime % ((60 * 60) / 60) / 60)) + " second(s).";
    }

    var timeFormatted = hours + minutes + seconds;
    return timeFormatted;
}