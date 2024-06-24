const { SlashCommandBuilder } = require('discord.js');
const { UnbindCourse, CourseExists } = require('../../ed/ed-handler.mjs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unbind')
		.setDescription('Unbinds a course from this Discord channel'),
	async execute(interaction) {
		const courseId = interaction.options.getInteger('course_id');
		const channelId = interaction.channel.id;
		if (!CourseExists(courseId)) {
			await interaction.reply({content: `❌ Course with ID ${courseId} is not loaded into the bot.`, ephemeral: true});
			return;
		}
		try {
			UnbindCourse(courseId, channelId);
			await interaction.reply({content: `✅ Course with ID ${courseId} has been unbound from this channel successfully!`, ephemeral: true});
		} catch (error) {
			console.error(error);
			await interaction.reply({content: `❌ An error occurred while unbinding the course.`, ephemeral: true});
		}
	},
};