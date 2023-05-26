Open-Source Discord Music Bot

This is an open-source Discord music bot capable of playing songs from YouTube. It utilizes the Discord.js library and provides the following commands and usage instructions.

## Installation
https://discordjs.guide/#before-you-begin:
To set up the bot, follow these steps:

1. Install the required packages by running the following commands:

```shell
npm install yt-search
npm install ytdl-core
npm install ytpl
npm install sodium
npm install undici
npm install ffmpeg-static
npm install libsodium-wrappers
```

2. If you encounter any issues while running the bot, you can download the `package.json` file and run `npm install` to install the dependencies.

## Commands and Usage

### Play a Song

To play a song, use the `!play` command followed by either the song name or the song link from YouTube.

```shell
!play songname
!play songlink
```

### Play a Playlist

To play a YouTube playlist, use the `!plist` command followed by the YouTube playlist link.

```shell
!plist YouTube playlist link
```

### Clear Queue

To clear the bot's queue and reset its queue data, use the `!cq` command.

```shell
!cq
```

Please note that this is a basic overview of the available commands. You can refer to the [Discord.js guide](https://discordjs.guide/) for more details on how to customize and enhance the bot.

## Contributing

If you would like to contribute to the development of this bot, feel free to fork the repository, make your changes, and submit a pull request. We appreciate any contributions and improvements to the project.

## License

This bot is released under the [MIT License](LICENSE). You are free to use, modify, and distribute the code as per the terms of the license.

Please let us know if you encounter any issues or have suggestions for improvements. We hope you find this bot useful!
