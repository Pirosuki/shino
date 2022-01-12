# shino.js
shino.js is a Discord bot for the Utter Discord server.

## To do:
- audio playback
- ytdl search
- ytdl playlist search
- spotify search -> ytdl, incl playlists.
- Scheduled server icon change
- Auto generate .json files
- Embed command
- Command toggle for playing through a default playlist

## Dependencies:
shino.js requires [Node.js](https://nodejs.org/) v16.6.0 or higher.

To build this bot on Windows you're gonna need Microsoft Visual Studio 2015 Build Tools, the easiest way to get that is by going to the [Visual Studio downloads page](https://my.visualstudio.com/Downloads) and looking for "Visual C++ Build Tools for Visual Studio 2015 with Update 3".

## How to use
- Git pull the repository and download dependencies using npm by typing `npm install` in your terminal.
- Create a file called `secrets.json` and enter your bot and server information in there as specified below; **DO NOT SHARE THIS INFORMATION WITH ANYONE, IT IS CALLED SECRETS FOR A REASON!**
```
{
    "clientId": "Enter clientId here",
    "guildId": ["Enter guildId(s) here"],
    "token": "Enter token here"
}
```
- Assuming that you've already looked through the Dependencies section, add the bot commands to your server by opening a terminal and typing `node deploy-commands.js` and then the bot can be run by typing `node index.js`.