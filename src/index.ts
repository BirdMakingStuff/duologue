import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client, Collection, Events, GatewayIntentBits, PermissionsBitField } from 'discord.js';
import EdAdapter from './ed/ed-adapter.js';
import type { ChatCommand } from './types/command.js';
import 'dotenv/config';

type CommandModule = { command: ChatCommand };

interface DuologueClient extends Client {
	commands: Collection<string, ChatCommand>;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] }) as DuologueClient;
client.commands = new Collection<string, ChatCommand>();

const __dirname = dirname(fileURLToPath(import.meta.url));
const folderPath = join(__dirname, 'commands');
const commandFolders = readdirSync(folderPath);
for (const folder of commandFolders) {
	const commandsPath = join(folderPath, folder);
	const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));
	for (const file of commandFiles) {
		const filePath = join(commandsPath, file);
		const module: CommandModule = await import(pathToFileURL(filePath).href);
		const { command } = module;
		if (command && 'data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.warn(`[${(new Date()).toLocaleString()}] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.once(Events.ClientReady, readyClient => {
	console.log(`[${(new Date()).toLocaleString()}] Ready! Logged in as ${readyClient.user.tag}`);
});

const ADMIN_ONLY_COMMANDS = new Set(['bind', 'unbind']);
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const duologueClient = interaction.client as DuologueClient;
	const command = duologueClient.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	const lacksAdminPermissions = ADMIN_ONLY_COMMANDS.has(interaction.commandName) && (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator));
	if (lacksAdminPermissions) {
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

const discordToken = process.env.DISCORD_TOKEN;
if (!discordToken) {
	throw new Error('DISCORD_TOKEN is not set.');
}
client.login(discordToken);

const ed = new EdAdapter(client);
ed.poll();