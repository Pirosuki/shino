# shino
shino is a Discord bot for the Utter discord server.

## To do:
- ytdl search
- ytdl playlist search
- spotify search -> ytdl, incl playlists.
- Auto disconnect if no user in voice
- Clear channel messages with confirmation
- Now playing replaces last message with new
- Button to pm latest song
- /remindme
- timer after queue runs out incase anyone wants to add another
- Lower volume when people speak
- /wrongsong

## Dependencies:
shino requires [Node.js](https://nodejs.org/) v16.6.0 or higher.

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