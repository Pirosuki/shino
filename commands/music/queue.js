const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const logger = require ('../../logger.js');

const { getQueue } = require('./play.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Get the queue"),

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
                if (guildQueue && guildQueue.tracks.length > 0) {
                    let maxLength = 10;
                    let sliceIndex = maxLength + 1;
                    if (guildQueue.tracks.length < maxLength) {
                        sliceIndex = guildQueue.tracks.length;
                    }
                    
                    let n = 1;
                    let formattedQueue = "";
                    guildQueue.tracks.slice(0, sliceIndex).forEach(track => {
                        if (n <= maxLength) {
                            formattedQueue += "[" + n + "] [" + track.title + "](https://youtu.be/" + track.id + "/) | " + track.user + "\n"
                            n += 1;
                        }
                        else {
                            hiddenTracks = guildQueue.tracks.length - maxLength;
                            formattedQueue += "and " + hiddenTracks + " more...";
                            return
                        }
                    });

                    const queueEmbed = new EmbedBuilder()
                    .setTitle("Queue")
                    .setDescription(formattedQueue)

                    interaction.reply({ embeds: [queueEmbed] });
                } 
                else {
                    // Else return that it's empty
                    interaction.reply("The queue is currently empty");
                }
            });
            // Log to console
            logger.log('info', "[" + interaction.guild.name + "] " + interaction.user.username + " requested queue");
        }
    },
};