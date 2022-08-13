const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection, AudioPlayer } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pause")
        .setDescription("Pause current audio playback"),

    async execute(interaction) {
        // Get voice connection
        let connection = getVoiceConnection(interaction.guild.id);

        // Checks if bot is connected to a voice channel
        if (!connection || interaction.member.voice.channelId !== connection.joinConfig.channelId) {
            // If not then return error
            await interaction.reply({ content: "We have to be in the same voice channel for you to use that command", ephemeral: true });
        }
        else {
            // If it is, grab audio player
            const player = connection.state.subscription.player;

            // Check if player is already paused
            if (player.state.status == 'paused') {
                // If it is then return error
                await interaction.reply({ content: "Audio playback is already paused", ephemeral: true });
            }
            else {
                console.log(player.state.status);
                // Pause audio playback
                player.pause();
                

                // Reply to user
                await interaction.reply("Playback paused");

                // Log to console
                console.log("[" + interaction.guild.name + "] " + interaction.user.tag + " paused audio playback.");
            }
        }
    },
};