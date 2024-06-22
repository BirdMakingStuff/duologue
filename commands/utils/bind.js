const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bind')
		.setDescription('Binds an Ed Discussion course to this Discord channel'),
	async execute(interaction) {
	},
};