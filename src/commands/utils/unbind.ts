import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { UnbindCourse, CourseExists, CourseHasToken } from '../../ed/ed-handler.js';
import type { ChatCommand } from '../../types/command.js';

export const command: ChatCommand = {
	data: new SlashCommandBuilder()
		.setName('unbind')
		.setDescription('Unbinds a course from this Discord channel')
		.addIntegerOption(option => option.setName('course_id').setDescription('The ID of the Ed Discussion course').setRequired(true).setMinValue(1)),

	async execute(interaction) {
		const courseId = interaction.options.getInteger('course_id');
		if (!courseId) {
			await interaction.reply({ content: '❌ Invalid course ID provided.', flags: MessageFlags.Ephemeral });
			return;
		}
		const channelId = interaction.channelId;
		if (!CourseExists(courseId) || !CourseHasToken(courseId)) {
			await interaction.reply({ content: `❌ Course with ID ${courseId} is not loaded into the bot.`, flags: MessageFlags.Ephemeral });
			return;
		}
		try {
			UnbindCourse(courseId, channelId);
			await interaction.reply({ content: `✅ Course with ID ${courseId} has been unbound from this channel successfully!` });
		} catch (error) {
			console.error(`[${(new Date()).toLocaleString()}] ${error}`);
			await interaction.reply({ content: '🚩 An error occurred while unbinding the course.', flags: MessageFlags.Ephemeral });
		}
	},
};