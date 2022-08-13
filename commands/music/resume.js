const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resume")
        .setDescription("Resume audio playback"),

    async execute(interaction) {
        // Get voice connection
        const connection = getVoiceConnection(interaction.guild.id);

        // Get audio player
        const player = connection.state.subscription.player;

        // Checks that the connection is valid and that the connection matches between user and bot
        if (!connection || interaction.member.voice.channelId !== connection.joinConfig.channelId) {
            // If not then return error
            await interaction.reply({ content: "We have to be in the same voice channel for you to use that command", ephemeral: true });
        }
        // Check if player is idle
        else if (player.Idle) {
            // If it is then return error
            await interaction.reply({ content: "There is nothing to resune", ephemeral: true });
        }
        // Checks if player isn't paused
        else if (!player.Paused) {
            // If it isn't then return error
            await interaction.reply({ content: "Audio playback isn't paused", ephemeral: true });
        }
        else {
            // Resume audio playback
            player.unpause();

            // Reply to user
            await interaction.reply("Playback resumed");

            // Log to console
            console.log("[" + interaction.guild.name + "] " + interaction.user.tag + " resumed audio playback.");
        }
    },
};