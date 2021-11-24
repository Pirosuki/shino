const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roll")
        .setDescription("Rolls for a random number")
        .addIntegerOption(option =>
            option.setName('value')
                .setDescription("Max value of the dice roll, defaults to 100.")),

    async execute(interaction) {
        if (!(interaction.options.getInteger() === undefined || interaction.options.getInteger() === null)) {
            maxValue = interaction.options.getInteger();
            value = randomInt(1, maxValue);
        }
        else {
            value = randomInt(1, 100);
        }
        await interaction.reply(interaction.user.username + " rolled " + value + " points!");
        
        console.log("[" + interaction.guild.name + "] " + "Rolled some dice for " + interaction.user.tag);
    },
};

function randomInt(maxValue, minValue) {
    return Math.floor(Math.random() * Math.ceil(maxValue - minValue)) + minValue
}