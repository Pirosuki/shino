const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop current music playback and have shino disconnect from voice"),

    async execute(interaction) {
        // Player should be automatically deleted once the voiceconnection is gone
        // Destroys voice connection
        const connection = getVoiceConnection(interaction.guild.id);
        connection.destroy();

        await interaction.reply("response");
        console.log("[" + interaction.guild.name + "] " + interaction.user.tag + " stopped music playback");
    },
};