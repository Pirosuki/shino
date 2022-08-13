const { SlashCommandBuilder } = require('@discordjs/builders');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice');
const { MessageEmbed } = require('discord.js');

const ytdl = require('ytdl-core');
const ytsr = require('ytsr');

// Creates music queue
const queue = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Have shino play audio from a specific url")
        .addStringOption(option =>
            option.setName("song")
                .setDescription("url or search terms for song")
                .setRequired(true)),

    async execute(interaction) {
        // Checks if user is in a voice channel
        if (interaction.member.voice.channelId !== null) {
            let currentConnection = getVoiceConnection(interaction.guildId);
            if (currentConnection == undefined || currentConnection._state.status !== ready || currentConnection.joinConfig.channelId !== interaction.member.voice.channelId) {
                const connection = joinVoiceChannel({
                    channelId: interaction.member.voice.channelId,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });
            }
        }
        else {
            await interaction.reply({content: "Couldn't join as you're not currently in a voice channel", ephemeral: true });
            console.log("[" + interaction.guild.name + "] " + "Failed to join voice channel as " + interaction.user.tag + " was not in a voice channel")

            return
        }

        let song = interaction.options.get("song").value;
        let resource;
        // Youtube album
        if (song.includes('youtube.com/playlist?list=')) {
            await interaction.reply("Identified YouTube playlist link, currently unsupported however.");
            console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
        }
        // Youtube track
        if (song.includes('youtu.be/') || song.includes('youtube.com/watch?v=')) {
            if (song.includes('?t')) {
                song = song.slice(0, song.indexOf('?t'));
            }
            getYouTube(song, interaction.user.tag, interaction);
        }
        // SoundCloud album
        else if (song.includes('soundcloud.com/') || song.includes('/sets/')) {
            await interaction.reply("Identified SoundCloud playlist link, currently unsupported however.");
            console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
        }
        // SoundCloud track
        else if (song.includes('soundcloud.com/')) {
            await interaction.reply("Identified SoundCloud track link, currently unsupported however.");
            console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
        }

        // Bandcamp album
        else if (song.includes('bandcamp.com/album/')) {
            await interaction.reply("Identified Bandcamp album link, currently unsupported however.");
            console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
        }
        // Bandcamp track
        else if (song.includes('bandcamp.com/track/')) {
            await interaction.reply("Identified Bandcamp track link, currently unsupported however.");
            console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as it wasn't from a supported website");
        }

        // Spotify album
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

        // Search
        else {
            searchYouTube(song, interaction.user.tag, interaction);
            console.log("[" + interaction.guild.name + "] " + "Searching for song requested by " + interaction.user.tag + " with search value: \"" + song + "\"");
        }
    },
};

async function getYouTube(url, userTag, interaction) {
    ytdl.getInfo(url)
    .catch(err => {
        console.log(err/*.message*/);
    })
    .then(info => {
        let songInfo = info.player_response.videoDetails;

        thumbList = songInfo.thumbnail.thumbnails;
        thumbnail = thumbList[thumbList.length - 1];

        const song = {
            title: songInfo.title,
            id: songInfo.videoId,
            user: userTag,
            thumbnail: thumbnail.url
        };
    
        queueYouTube(song, interaction);
    })
}

function searchYouTube(searchTerms, userTag, interaction) {
    ytsrSearch(searchTerms).then(songInfo => {
        if (songInfo.results === 0) { console.log("no results"); return;}

        songInfo = songInfo.items[0];

        const song = {
            title: songInfo.title,
            id: songInfo.id,
            user: userTag,
            thumbnail: songInfo.bestThumbnail.url.slice(0, songInfo.bestThumbnail.url.indexOf('.jpg') + 4)
        };

        queueYouTube(song, interaction);
    })
}

async function ytsrSearch(searchTerms) {
    const filters = await ytsr.getFilters(searchTerms);
    const filter = filters.get('Type').get('Video');
    const options = {
    limit: 1,
    }
    const searchResults = await ytsr(filter.url, options);
    return searchResults;
}

async function queueYouTube(song, interaction) {
    let guildQueue = queue.get(interaction.guild.id);

    if (!guildQueue) {
        createPlayer(interaction);
        guildQueue = queue.get(interaction.guild.id);
    }

    // Add song to queue
    guildQueue.songs.push(song);

    // Check if there's only one song in the queue
    if (guildQueue.songs.length === 1 && !guildQueue.currentSong) {
        playNext(guildQueue);

        // Once done get next song
        guildQueue.player.on(AudioPlayerStatus.Idle, () => {
            playNext(guildQueue);
        });
        guildQueue.player.on(AudioPlayerStatus.Playing, () => {
            announcePlaying(interaction, guildQueue);
        });
        
        // https://github.com/discordjs/discord.js/issues/5202
        let ytdlURL = ytdl(song.id);

        ytdlURL.on('error', err => {
            // catch url related errors here
            console.log(err);
        });
    }
    else {
        console.log("song queued")
        // send queued song message since it's not playing immediately
    }
    console.log("[" + interaction.guild.name + "] " + "Queued song " + "\"" + song.title + "\" as requested by " + interaction.user.tag);
}

function playNext(guildQueue, interaction) {
    console.log("playing next");
    if (guildQueue.length !== 0) {
        // Get random in quque and remove it if shuffle == true
        if (guildQueue.shuffle) {
            let index = Math.floor(
                Math.random() * guildQueue.songs.length
            )
            song = guildQueue.songs[index];
            guildQueue.songs.splice(index, 1);
        }
        // Get first in queue and remove it
        else {
            song = guildQueue.songs.shift();
        }

        // Readds song to end of queue if loop == true
        if (guildQueue.looping) {
            guildQueue.songs.push(song);
        }

        // Sets currentSong value
        guildQueue.currentSong = song;

        let ytdlURL = ytdl(song.id);
        ytdlURL.on('error', err => {
            // catch url related errors here
            console.log(err); 
        });

        resource = createAudioResource(ytdlURL);
        guildQueue.player.play(resource);
    }
    else {
        guildQueue.currentSong = undefined;
        console.log("out of songs");
    }
}

async function createPlayer(interaction) {
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Stop,
        },
    });

    const connection = getVoiceConnection(interaction.guild.id);
    
    try {
        connection.subscribe(player);
    }
    catch (TypeError) {
        await interaction.reply({ content: "Couldn't play as I'm not currently in a voice channel", ephemeral: true });
        console.log("[" + interaction.guild.name + "] " + "Failed to play url requested by " + interaction.user.tag + " as shino wasn't connected to a voice channel")
        return
    }

    let guildQueue = {
        textChannel: interaction.channel,
        nowPlayingMsgId: '',
        connection: connection,
        player: player,
        currentSong: undefined,
        songs: [],
        loop: false,
        shuffle: false
    }

    queue.set(interaction.guild.id, guildQueue)
}

async function announcePlaying(interaction, guildQueue) {
    const currentSongEmbed = new MessageEmbed()
            .setTitle(guildQueue.currentSong.title)
            .setURL('https://youtu.be/' + guildQueue.currentSong.id + '/')
            .setThumbnail(guildQueue.currentSong.thumbnail)
            .addFields(
                { name: 'Title', value: guildQueue.currentSong.title },
                { name: 'Requested by', value: guildQueue.currentSong.user }
            );

        await interaction.reply({ embeds: [currentSongEmbed] });
}