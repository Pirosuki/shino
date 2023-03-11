const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');
const logger = require ('../../logger.js');

const { getQueue } = require('./play.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shuffle")
        .setDescription("Toggle shuffling the queue"),

    async execute(interaction) {
        // Get voice connection
        let connection = getVoiceConnection(interaction.guild.id);

        // Checks if bot is connected to a voice channel
        if (!connection || interaction.member.voice.channelId !== connection.joinConfig.channelId) {
            // If not then return error
            await interaction.reply({ content: "We have to be in the same voice channel for you to use that command", ephemeral: true });
        }
        else {
            // Get queue
            getQueue(interaction)
            .then(guildQueue => {
                guildQueue.shuffle = !guildQueue.shuffle;

                if (guildQueue.shuffle) {
                    interaction.reply("Enabled shuffling the queue");
                }
                else {
                    interaction.reply("Disabled shuffling the queue");
                }

                // Log to console
                logger.log('info', "[" + interaction.guild.name + "] " + interaction.user.tag + " toggled shuffling the queue");
            })
        }
    },
};