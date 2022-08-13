const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pause")
        .setDescription("Pause any current audio playback"),

    async execute(interaction) {
        let player = ""; // Fix this

        player.pause();

        await interaction.reply("Paused audio playback");
        console.log("[" + interaction.guild.name + "] " + interaction.user.tag + " paused audio playback");
    },
};