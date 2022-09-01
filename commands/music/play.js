// https://github.com/discordjs/discord.js/issues/5202

const { SlashCommandBuilder } = require('@discordjs/builders');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');

const ytdl = require('ytdl-core');
const ytsr = require('ytsr');

// Import settings from config file
var config = require('../../config.json');

// Creates music queue
const queue = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play audio from a specific url")
        .addStringOption(option =>
            option.setName("song")
                .setDescription("url or search terms for song")
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
                });
            }

            // Grabs song entered in command
            let song = interaction.options.getString('song');

            // Attempts to figure out origin of entered url
            // Youtube playlist
            if (song.includes('youtube.com/playlist?list=')) {
                await interaction.reply("Identified YouTube playlist link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }
            // Youtube track
            if (song.includes('youtu.be/') || song.includes('youtube.com/watch?v=')) {
                if (song.includes('?t')) {
                    song = song.slice(0, song.indexOf('?t'));
                }
                trackYoutube(song, interaction.user.tag, interaction);
            }
            // SoundCloud playlist
            else if (song.includes('soundcloud.com/') || song.includes('/sets/')) {
                await interaction.reply("Identified SoundCloud playlist link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }
            // SoundCloud track
            else if (song.includes('soundcloud.com/')) {
                await interaction.reply("Identified SoundCloud track link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }

            // Bandcamp playlist
            else if (song.includes('bandcamp.com/album/')) {
                await interaction.reply("Identified Bandcamp album link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }
            // Bandcamp track
            else if (song.includes('bandcamp.com/track/')) {
                await interaction.reply("Identified Bandcamp track link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }

            // Spotify playlist
            else if (song.includes('open.spotify.com/playlist/') || song.includes('open.spotify.com/album/')) {
                await interaction.reply("Identified Spotify playlist link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
                return
            }
            // Spotify track
            else if (song.includes('open.spotify.com/track/')) {
                await interaction.reply("Identified Spotify track link, currently unsupported however.");
                console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
            }

            // If no matches, default to searching for entered value
            else {
                searchYouTube(song, interaction.user.tag, interaction);
            }
        }
        else {
            // If not reply with error
            await interaction.reply({ content: "You have to be in a voice channel that allows music playback to use this command.", ephemeral: true });
        }
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
        voiceChannel: interaction.member.voice.channel,
        textChannel: interaction.channel,
        nowPlayingMsg: undefined,
        currentSong: undefined,
        songs: [],
        loop: false,
        shuffle: false
    }

    // Adds queue to queue variable
    queue.set(interaction.guild.id, guildQueue);
}

// Function to play the next song in queue
async function playNext(guildQueue) {
    // Check whether shuffle is on
    if (guildQueue.shuffle) {
        // If it is, grab a random song
        // Creates random number
        let index = Math.floor(
            Math.random() * guildQueue.songs.length
        )

        // Grabs song based on that number
        song = guildQueue.songs[index];

        // Removes that song from the queue
        guildQueue.songs.splice(index, 1);
    }
    else {
        // If not, grab the latest song and remove it from the queue
        song = guildQueue.songs.shift();
    }

    // Readds song to end of queue if loop == true
    if (guildQueue.looping) {
        guildQueue.songs.push(song);
    }

    // Sets currentSong value
    guildQueue.currentSong = song;

    // Get song info https://github.com/fent/node-ytdl-core/issues/902 highestaudio
    let ytdlURL = ytdl(song.id, {
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
        console.log(err); 
    });

    // Creates audio resource with song info
    resource = createAudioResource(ytdlURL, { inlineVolume: true });

    // Sets a more livable volume
    resource.volume.setVolume(0.1);

    // Plays the song
    guildQueue.player.play(resource);
}

// Function for announcing the current playing song
async function announcePlaying(guildQueue) {
    // Formats song title, url and stuff into embed
    const currentSongEmbed = new EmbedBuilder()
            .setTitle(guildQueue.currentSong.title)
            .setURL('https://youtu.be/' + guildQueue.currentSong.id + '/')
            .setThumbnail(guildQueue.currentSong.thumbnail)
            .addFields(
                { name: 'Title', value: guildQueue.currentSong.title },
                { name: 'Requested by', value: guildQueue.currentSong.user }
            );

    // Checks if a now playing message currently exists
    if (guildQueue.nowPlayingMsg) {
        // If it does, delete it
        guildQueue.nowPlayingMsg.delete();
    }

    // Send a new now playing message and save it to the guild queue
    guildQueue.nowPlayingMsg = await guildQueue.textChannel.send({ embeds: [currentSongEmbed] });
}

async function trackYoutube(url, userTag, interaction) {
    // Gets info of specified youtube url
    ytdl.getInfo(url)
    .catch(err => {
        // Catch eventual url errors
        console.log(err);
    })
    .then(info => {
        // Grab returned info
        let songInfo = info.player_response.videoDetails;

        // Grab thumbnail url
        thumbnail = songInfo.thumbnail.thumbnails[songInfo.thumbnail.thumbnails.length - 1];

        // Format all song info into a variable
        const song = {
            title: songInfo.title,
            id: songInfo.videoId,
            user: userTag,
            inPlaylist: false,
            thumbnail: thumbnail.url
        };
    
        // Send to queue function
        queueYouTube(song, interaction);
    })
}


// Function for handling youtube searches
function searchYouTube(searchTerms, userTag, interaction) {
    // Trigger function to retrieve results
    ytsrSearchYoutube(searchTerms).then(songInfo => {
        // Check if there are results
        if (songInfo.results == 0) {
            // If there aren't then send an error back // FIX/
            console.log("no results");
        }
        else {
            // If there are then get first song // FIX // Maybe display results and let user pick
            songInfo = songInfo.items[0];

            // Format song info into variable
            const song = {
                title: songInfo.title,
                id: songInfo.id,
                user: userTag,
                inPlaylist: false,
                thumbnail: songInfo.bestThumbnail.url.slice(0, songInfo.bestThumbnail.url.indexOf('.jpg') + 4)
            };

            // Send to queue function
            queueYouTube(song, interaction);
        }
        
    })
}
// Extension of searchYoutube function so we wait until results arrive
async function ytsrSearchYoutube(searchTerms) {
    // Add search terms
    const filters = await ytsr.getFilters(searchTerms);

    // Att filter to remove anything other than videos
    const filter = filters.get('Type').get('Video');

    // Option to only grab one result
    const options = {
    limit: 1,
    }

    // Search with required terms
    const searchResults = await ytsr(filter.url, options);

    // Return results
    return searchResults;
}

// Function for adding youtube urls to the playback queue
async function queueYouTube(song, interaction) {
    // Grabs current queue
    let guildQueue = queue.get(interaction.guild.id);

    // If guildQueue didn't exist then create one
    if (!guildQueue) {
        createPlayer(interaction);
        guildQueue = queue.get(interaction.guild.id);
    }

    // Add song to queue
    guildQueue.songs.push(song);

    // Check if there's already a song playing
    if (!guildQueue.currentSong) {
        // If not then start playing this song
        playNext(guildQueue, interaction);

        // Once done get next song
        guildQueue.player.on(AudioPlayerStatus.Idle, () => {
            // Clear current song value from queue
            guildQueue.currentSong = undefined;

            // Checks if queue has songs in it
            if (guildQueue.songs.length == 0) {
                // If not, replace now playing message with a more fitting one
                guildQueue.nowPlayingMsg.delete();
                guildQueue.nowPlayingMsg = guildQueue.textChannel.send("Queue empty, disconnecting");

                // Destroy voice connection
                guildQueue.connection.destroy();

                // Delete guild queue
                queue.delete(interaction.guild.id);
            }
            else {
                // If it does, play the next song
                playNext(guildQueue);
            }
        });

        // Announce current playing song
        guildQueue.player.on(AudioPlayerStatus.Playing, () => {
            announcePlaying(guildQueue);
        });
    }

    // Reply queued song message
    await interaction.reply("Queued song \"" + song.title + "\"");

    // Log to console
    console.log("[" + interaction.guild.name + "] " + interaction.user.tag + " queued song " + "\"" + song.title + "\"");
}