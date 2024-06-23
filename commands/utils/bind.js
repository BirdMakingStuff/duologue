const { SlashCommandBuilder } = require('discord.js');
const { bindCourse, getCourseBindings } = require('../../ed/ed-handler.mjs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bind')
		.setDescription('Binds an Ed Discussion course to the current Discord channel')
		.addIntegerOption(option => option.setName('course_id').setDescription('The ID of the Ed Discussion course').setRequired(true).setMinValue(1))
		.addStringOption(option => option.setName('thread_types').setDescription('If the channel subscribes to only announcements or only normal threads').setRequired(false).addChoice({name: 'Announcements', value: 'announcements'}).addChoice({name: 'Normal', value: 'normal'})),
	async execute(interaction) {
		const courseId = interaction.options.getInteger('course_id');
		const channelId = interaction.channel.id;
		try {
			bindCourse(courseId, channelId);
			await interaction.reply({content: `✅ Course with ID ${courseId} has been bound to this channel successfully!`, ephemeral: true});
		} catch(error) {
			console.error(error);
			await interaction.reply({content: `❌ An error occurred while binding the course. You may have bound to a course which does not exist in the bot's database.`, ephemeral: true});
		}
	},
};