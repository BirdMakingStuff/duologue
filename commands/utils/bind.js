import { SlashCommandBuilder } from 'discord.js';
import { BindCourse, CourseExists, GetCourseBindings } from '../../ed/ed-handler.js';

export const command = {
	data: new SlashCommandBuilder()
	.setName('bind')
	.setDescription('Binds an Ed Discussion course to the current Discord channel')
	.addIntegerOption(option => option.setName('course_id').setDescription('The ID of the Ed Discussion course').setRequired(true).setMinValue(1))
	.addStringOption(option => option.setName('thread_types').setDescription('If the channel subscribes to only announcements or only normal threads').setRequired(true).addChoices({ name: 'Announcements', value: 'announcements' }, { name: 'Normal', value: 'normal' })),
	
	async execute(interaction) {
		const courseId = interaction.options.getInteger('course_id');
		const threadType = interaction.options.getString('thread_types');
		const channelId = interaction.channel.id;
		if (!CourseExists(courseId)) {
			await interaction.reply({ content: `❌ Course with ID ${courseId} is not loaded into the bot.`, ephemeral: true });
			return;
		}
		if (GetCourseBindings(courseId, threadType).includes(channelId)) {
			await interaction.reply({ content: `❌ Course with ID ${courseId} is already bound to this channel.`, ephemeral: true });
			return;
		}
		try {
			BindCourse(courseId, channelId, threadType);
			await interaction.reply({ content: `✅ Course with ID ${courseId} has been bound to this channel successfully!`, ephemeral: true });
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: `❌ An error occurred while binding the course.`, ephemeral: true });
		}
	}
};