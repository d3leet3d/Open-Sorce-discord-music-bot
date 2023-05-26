const { Client, Events, GatewayIntentBits, Message, VoiceBasedChannel, PermissionFlagsBits } = require('discord.js');
const { VoiceConnection, joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, AudioPlayerStatus } = require('@discordjs/voice');
const yts = require('yt-search');
const { token } = require('./config.json');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');

const client = new Client({
  intents: [
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages
  ],
});

const queue = new Map();

client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.content.startsWith('!play')) {
    let serverQueue = queue.get(message.guild?.id || '');
    const voiceChannel = message.member?.voice.channel;

    if (!voiceChannel) {
      message.reply('You need to be in a voice channel to play music.');
      return;
    }
    if (serverQueue) {
      if (message.member.permissions.has(PermissionFlagsBits.MoveMembers) && voiceChannel != serverQueue.voiceChannel) {
        if (serverQueue.connection) {
          serverQueue.connection.disconnect();
        }
        serverQueue.player.stop();
        serverQueue.songs = [];
        queue.delete(message.guild?.id);
        serverQueue = queue.get(message.guild?.id || '');
      } else if (voiceChannel != serverQueue.voiceChannel) {
        message.reply("You need to be in the same voice channel as the bot!");
        return;
      }
    }
    const song = message.content.slice(6);
    const searchResult = await yts(song);

    if (!searchResult.videos.length) {
      message.reply('No search results found.');
      return;
    }

    const songData = {
      title: searchResult.videos[0].title,
      url: searchResult.videos[0].url,
    };

    if (!serverQueue) {
      const queueData = {
        voiceChannel: voiceChannel,
        connection: null,
        songs: [],
        player: createAudioPlayer(),
      };

      queue.set(message.guild?.id, queueData);
      queueData.songs.push(songData);

      try {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guildId,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator
        });

        queueData.connection = connection;
        connection.subscribe(queueData.player);
        playSong(message.guild?.id, queueData.songs[0]);
        message.reply(`Playing: ${songData.title}`);
      } catch (error) {
        console.error('Failed to join voice channel:', error);
        queue.delete(message.guild?.id);
        message.reply('Failed to join the voice channel.');
        return;
      }
    } else {
      serverQueue.songs.push(songData);
      message.reply(`${songData.title} has been added to the queue.`);
      return;
    }
  } else if (message.content.startsWith('!plist')) {
    const voiceChannel = message.member?.voice.channel;
    if (!voiceChannel) {
      message.reply('You need to be in a voice channel to play music.');
      return;
    }

    const playlistUrl = message.content.slice(10);
    try {
      const playlist = await ytpl(playlistUrl, { limit: Infinity });
      const playlistInfo = playlist.title;
      const songs = playlist.items.map((item) => ({
        title: item.title,
        url: item.shortUrl,
      }));

      let serverQueue = queue.get(message.guild?.id || '');
      if (!serverQueue) {
        const queueData = {
          voiceChannel: voiceChannel,
          connection: null,
          songs: songs,
          player: createAudioPlayer(),
        };

        queue.set(message.guild?.id, queueData);

        try {
          const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator
          });
          queueData.connection = connection;
          connection.subscribe(queueData.player);
          playSong(message.guild?.id, queueData.songs[0]);
          message.reply(`Playing playlist: ${playlistInfo}`);
        } catch (error) {
          console.error('Failed to join voice channel:', error);
          queue.delete(message.guild?.id);
          message.reply('Failed to join the voice channel.');
          return;
        }
      } else {
        serverQueue.songs.push(...songs);
        message.reply(`Added playlist: ${playlistInfo} to the queue.`);
      }
    } catch (error) {
      console.error('Failed to fetch playlist:', error);
      message.reply('Failed to fetch the playlist.');
      return;
    }
  } else if (message.content.startsWith('!skip')) {
    const serverQueue = queue.get(message.guildId || '');
    if (!serverQueue || !serverQueue.connection || !serverQueue.player) return;

    serverQueue.player.stop();
    message.reply('Skipped the current song.');
  } else if (message.content.startsWith('!cq')) {
    if (!message.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
      message.reply("You need MoveMembers perms to clear the queue");
    }
    const serverQueue = queue.get(message.guildId || '');
    if (serverQueue) {
      serverQueue.connection.disconnect();
      serverQueue.player.stop();
      serverQueue.songs = [];
      queue.delete(message.guildId);
      message.reply("Queue data has been cleared");
    }
  }
});

async function playSong(guildId, song) {
  const serverQueue = queue.get(guildId);
  if (!serverQueue || !serverQueue.connection || !serverQueue.player) return;

  const stream = ytdl(song.url, {
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25, // 32MB
  });

  const resource = createAudioResource(stream, {
    inputType: StreamType.Arbitrary,
  });

  serverQueue.player.play(resource);
  serverQueue.player.once(AudioPlayerStatus.Idle, () => {
    serverQueue.songs.shift();
    if (serverQueue.songs.length > 0) {
      playSong(guildId, serverQueue.songs[0]);
    }
  });
}

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  let MuteTriggered = false;
  if (oldState.mute != newState.mute || oldState.deaf != newState.deaf ||
    oldState.streaming != newState.streaming || oldState.selfVideo != newState.selfVideo
    || oldState.serverMute != newState.serverMute || oldState.serverDeaf != newState.serverDeaf) {
    MuteTriggered = true;
  }

  if (newState.channelId === null) {
    if (oldState.member.user == client.user) {
      try {
        let serverQueue = queue.get(oldState.guild?.id || '');
        serverQueue.player.stop(true);
        queue.delete(oldState.guild?.id);
        console.log("Bot Left Vc");
      } catch (error) {
        console.log(error, oldState.guild.id);
      }
    }
  }
});

client.login(token);
