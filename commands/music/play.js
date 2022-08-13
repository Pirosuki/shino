const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play audio from a specific url")
        .addStringOption(option =>
            option.setName("song")
                .setDescription("url or search terms for song")
                .setRequired(true)),

    async execute(interaction) {
        let song = interaction.options.getString('song');
    },
};