// Require the necessary discord.js classes
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Client, Collection, Events, GatewayIntentBits, PermissionsBitField } from 'discord.js';
import ed_adapter from './ed/ed-adapter.js';
import 'dotenv/config';

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Create a new Collection to hold your commands.
client.commands = new Collection();
const __dirname = import.meta.dirname;
const folderPath = join(__dirname, 'commands');
const commandFolders = readdirSync(folderPath);
for (const folder of commandFolders) {
	const commandsPath = join(folderPath, folder);
	const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = join(commandsPath, file);
		const { command } = await import(pathToFileURL(filePath));
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.warn(`[${(new Date()).toLocaleString()}] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// When the client is ready, run this code
client.once(Events.ClientReady, readyClient => {
	console.log(`[${(new Date()).toLocaleString()}] Ready! Logged in as ${readyClient.user.tag}`);
});


const ADMIN_ONLY_COMMANDS = new Set(["bind", "unbind"]);
// Handles client commands
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	};

	if (ADMIN_ONLY_COMMANDS.has(interaction.commandName) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
		await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: '🚩 There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: '🚩 There was an error while executing this command!', ephemeral: true });
		}
	}
});
// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);

// Polls the Ed API for new posts.
const ed = new ed_adapter(client);
ed.poll();