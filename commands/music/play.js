// https://github.com/discordjs/discord.js/issues/5202

const { SlashCommandBuilder } = require('@discordjs/builders');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');

// Imports logger
const logger = require ('../../logger.js');

const ytpl = require('ytpl');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');

// Import settings from config file
var config = require('../../config.json');

// Creates music queue
const queue = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a youtube track or album")
        .addStringOption(option =>
            option.setName("title")
                .setDescription("url or search terms for track")
                .setRequired(true)),

    async execute(interaction) {
        // Checks if user is connected to a valid voice channel
        if (config.music.validVoiceChannels.includes(interaction.member.voice.channelId)) {
            // if they are, check if the bot is connected and if so user and bot aren't in the same channel already
            if (!getVoiceConnection(interaction.guild.id) || interaction.member.voice.channelId !== getVoiceConnection(interaction.guild.id).joinConfig.channelId) {
                // If they aren't, connect bot to specified channel
                const connection = joinVoiceChannel({
                    channelId: interaction.member.voice.channelId,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    /*debug: true,*/
                });

                // Temporary error fix, check https://github.com/discordjs/discord.js/issues/9185#issuecomment-1459083216
                const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
                    const newUdp = Reflect.get(newNetworkState, 'udp');
                    clearInterval(newUdp?.keepAliveInterval);
                  }
                  connection.on('stateChange', (oldState, newState) => {
                    Reflect.get(oldState, 'networking')?.off('stateChange', networkStateChangeHandler);
                    Reflect.get(newState, 'networking')?.on('stateChange', networkStateChangeHandler);
                });
            }

            // Grabs terms entered in command
            let terms = interaction.options.getString('title');

            // Attempts to figure out origin of entered url

            // Youtube album
            if (terms.includes('youtube.com/playlist?list=')) {
                albumYoutube(interaction, terms);
            }
            // Youtube track
            else if (terms.includes('youtu.be/') || terms.includes('youtube.com/watch?v=')) {
                if (terms.includes('?t')) {
                    terms = terms.slice(0, terms.indexOf('?t'));
                }
                trackYoutube(interaction, terms);
            }
            // SoundCloud album
            else if (terms.includes('soundcloud.com/') || terms.includes('/sets/')) {
                await interaction.reply("Identified SoundCloud album link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }
            // SoundCloud track
            else if (terms.includes('soundcloud.com/')) {
                await interaction.reply("Identified SoundCloud track link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }

            // Bandcamp album
            else if (terms.includes('bandcamp.com/album/')) {
                await interaction.reply("Identified Bandcamp album link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }
            // Bandcamp track
            else if (terms.includes('bandcamp.com/track/')) {
                await interaction.reply("Identified Bandcamp track link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }

            // Spotify album
            else if (terms.includes('open.spotify.com/album/') || terms.includes('open.spotify.com/album/')) {
                await interaction.reply("Identified Spotify album link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
                return
            }
            // Spotify track
            else if (terms.includes('open.spotify.com/track/')) {
                await interaction.reply("Identified Spotify track link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }

            // If no matches, default to searching for entered value
            else {
                searchYouTube(interaction, terms);
            }
        }
        else {
            // If not reply with error
            await interaction.reply({ content: "You have to be in a voice channel that allows music playback to use this command.", ephemeral: true });
        }
    },

    async getQueue(interaction) {
        // Grabs current queue
        let guildQueue = queue.get(interaction.guild.id);

        // Returns the queue
        return guildQueue;
    },
};

// Function for creating the audio player instance
async function createPlayer(interaction) {
    // Create player
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Stop,
        },
    });

    // Grab voice connection
    const connection = getVoiceConnection(interaction.guild.id);
    
    // Attempt to connect voice connection to audio player
    connection.subscribe(player);

    // Creates queue for current guild
    let guildQueue = {
        player: player,
        connection: connection,
        timeout: false,
        voiceChannel: interaction.member.voice.channel,
        textChannel: interaction.channel,
        nowPlayingMsg: undefined,
        currentTrack: undefined,
        tracks: [],
        loop: false,
        shuffle: false
    }

    // Adds queue to queue variable
    queue.set(interaction.guild.id, guildQueue);
}

// Function to play the next track in queue
async function playNext(guildQueue) {
    // Check whether shuffle is on
    if (guildQueue.shuffle) {
        // If it is, grab a random track
        // Creates random number
        let index = Math.floor(
            Math.random() * guildQueue.tracks.length
        )

        // Grabs track based on that number
        track = guildQueue.tracks[index];

        // Removes that track from the queue
        guildQueue.tracks.splice(index, 1);
    }
    else {
        // If not, grab the latest track and remove it from the queue
        track = guildQueue.tracks.shift();
    }

    // Readds track to end of queue if loop == true
    if (guildQueue.loop) {
        guildQueue.tracks.push(track);
    }

    // Sets currentTrack value
    guildQueue.currentTrack = track;

    // Get track info https://github.com/fent/node-ytdl-core/issues/902 highestaudio
    let ytdlURL = ytdl(track.id, {
        filter: "audioonly",
        fmt: "mp3",
        highWaterMark: 1 << 62,
        liveBuffer: 1 << 62,
        dlChunkSize: 0,
        bitrate: 128,
        quality: "lowestaudio",
    });
    ytdlURL.on('error', err => {
        // catch url related errors
        logger.error(err); 
    });

    // Creates audio resource with track info
    resource = createAudioResource(ytdlURL, { inlineVolume: true });

    // Sets a more livable volume
    resource.volume.setVolume(config.music.volume / 100);

    // Plays the track
    guildQueue.player.play(resource);
}

// Function for announcing the current playing track
async function announcePlaying(guildQueue) {
    // Formats track title, url and stuff into embed
    const currentTrackEmbed = new EmbedBuilder()
    .setTitle(guildQueue.currentTrack.title)
    .setURL('https://youtu.be/' + guildQueue.currentTrack.id + '/')
    .setThumbnail(guildQueue.currentTrack.thumbnail)
    .addFields(
        { name: 'Title', value: guildQueue.currentTrack.title },
        { name: 'Requested by', value: guildQueue.currentTrack.user }
    );

    // Checks if a now playing message currently exists
    if (guildQueue.nowPlayingMsg) {
        // If it does, delete it
        try {
            guildQueue.nowPlayingMsg.delete();
        }
        catch (err) {
            console.log("failed to delete message line 231");
        }
    }

    // Send a new now playing message and save it to the guild queue
    guildQueue.nowPlayingMsg = await guildQueue.textChannel.send({ embeds: [currentTrackEmbed] });
}

async function albumYoutube(interaction, url) {
    try {
        interaction.reply("am attempting, pls no break :)")
        ytpl(url, { limit: Infinity })
        .then(albumInfo => {
            albumInfo.items.forEach(trackInfo => {
                // Send to queue function
                if (trackInfo.isPlayable) {
                    // Format track info into variable
                    const track = {
                        title: trackInfo.title,
                        id: trackInfo.id,
                        user: interaction.user.tag,
                        inAlbum: true,
                        thumbnail: trackInfo.bestThumbnail.url.slice(0, trackInfo.bestThumbnail.url.indexOf('.jpg') + 4)
                    };

                    queueYouTube(interaction, track);
                }
            });
        })
    }
    catch(error) {
        // Log error
        console.error(error);
    }    
}

async function trackYoutube(interaction, url) {
    // Gets info of specified youtube url
    ytdl.getInfo(url)
    .then(info => {
        // Grab returned info
        let trackInfo = info.player_response.videoDetails;

        // Grab thumbnail url
        thumbnail = trackInfo.thumbnail.thumbnails[trackInfo.thumbnail.thumbnails.length - 1];

        // Format all track info into a variable
        const track = {
            title: trackInfo.title,
            id: trackInfo.videoId,
            user: interaction.user.tag,
            inAlbum: false,
            thumbnail: thumbnail.url
        };
    
        // Send to queue function
        queueYouTube(interaction, track);
    })
    .catch(error => {
        // Log error
        logger.error(error);

        // Inform user
        interaction.reply({ content: "Couldn't find a video with that url, sorry", ephemeral: true });
    })
}

// Function for handling youtube searches
async function searchYouTube(interaction, searchTerms) {
    // Add search terms
    const filters = await ytsr.getFilters(searchTerms);

    // Att filter to remove anything other than videos
    const filter = filters.get('Type').get('Video');

    // Option to only grab one result
    const options = { limit: 1, safeSearch: 1};

    // Search with required terms
    ytsr(filter.url, options).then(trackInfo => {
        // Check if there are results
        if (trackInfo.results == 0) {
            // Log error
            logger.error('Search for "' + searchTerms + '" yielded 0 results.');

            // Inform user
            interaction.reply({ content: "Search yielded no results, sorry", ephemeral: true });
            }
        else {
            // If there are then get first track // FIX // Maybe display results and let user pick
            trackInfo = trackInfo.items[0];

            // Format track info into variable
            const track = {
                title: trackInfo.title,
                id: trackInfo.id,
                user: interaction.user.tag,
                inAlbum: false,
                thumbnail: trackInfo.bestThumbnail.url.slice(0, trackInfo.bestThumbnail.url.indexOf('.jpg') + 4)
            };

            // Send to queue function
            queueYouTube(interaction, track);
        }
    })
}

// Function for adding youtube urls to the playback queue
async function queueYouTube(interaction, track) {
    // Grabs current queue
    let guildQueue = queue.get(interaction.guild.id);

    // If guildQueue didn't exist then create one
    if (!guildQueue) {
        createPlayer(interaction);
        guildQueue = queue.get(interaction.guild.id);
    }

    if (guildQueue.timeout) {
        clearTimeout(guildQueue.timeout);
        console.log("timeout cleared")
    }
    
    // Add track to queue
    if (!track.inAlbum) {
        let index = 0;
        let indexList = [];
        guildQueue.tracks.forEach(track => {
            if (track.inAlbum) {
                indexList.push(index);
            }
            
            index += 1;
        });

        if (indexList.length > 0) {
            guildQueue.tracks.splice(indexList[0], 0, track);
        }
        else {
            guildQueue.tracks.push(track);
        }
    }
    else {
        guildQueue.tracks.push(track);
    }

    // Check if there's already a track playing
    if (!guildQueue.currentTrack) {
        // If not then start playing this track
        playNext(guildQueue);

        // Once done get next track
        guildQueue.player.on(AudioPlayerStatus.Idle, () => {
            // Clear current track value from queue
            guildQueue.currentTrack = undefined;

            // Checks if queue has tracks in it
            if (guildQueue.tracks.length == 0) {
                if (guildQueue.nowPlayingMsg) {
                    try {
                        guildQueue.nowPlayingMsg.delete();
                    }
                    catch (err) {
                        console.log("failed to delete message line 392");
                    }

                    guildQueue.nowPlayingMsg = undefined;
                }
                
                async function disconnect() {
                    // Destroy voice connection
                    guildQueue.connection.destroy();

                    // Delete guild queue
                    queue.delete(interaction.guild.id);
                }

                // 1min timer to disconnect
                guildQueue.timeout = setTimeout(disconnect, 5 * 60 * 1000);
                console.log("timeout started");
            }
            else {
                // If it does, play the next track
                playNext(guildQueue);
            }
        });

        // Announce current playing track
        guildQueue.player.on(AudioPlayerStatus.Playing, () => {
            announcePlaying(guildQueue);
        });
    }

    // Reply and log queued track message if single track
    if (!track.inAlbum) {
        await interaction.reply("Queued track \"" + track.title + "\"");
        logger.log("info", "[" + interaction.guild.name + "] " + interaction.user.tag + " queued track " + "\"" + track.title + "\"");
    }
}