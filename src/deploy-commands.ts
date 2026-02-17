import { REST, RESTPostAPIApplicationCommandsJSONBody, Routes } from 'discord.js';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config } from 'dotenv';
import { CONFIG } from './index.js';
config();

type CommandModule = {
	command: {
		data: { toJSON: () => RESTPostAPIApplicationCommandsJSONBody };
		execute: unknown;
	};
};

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];
const __dirname = dirname(fileURLToPath(import.meta.url));
const foldersPath = join(__dirname, 'commands');
const commandFolders = readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = join(foldersPath, folder);
	const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));
	for (const file of commandFiles) {
		const filePath = join(commandsPath, file);
		const { command } = (await import(pathToFileURL(filePath).href)) as CommandModule;
		if (command && 'data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const discordToken = CONFIG["Discord"].token;
const clientId = CONFIG["Discord"].client_id;
if (!discordToken || !clientId) {
	throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set to deploy commands.');
}

const rest = new REST().setToken(discordToken);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });

		if (Array.isArray(data)) {
			console.log(`Successfully reloaded ${data.length} application (/) commands.`);
		} else {
			console.log('Successfully reloaded application (/) commands.');
		}
	} catch (error) {
		console.error(error);
	}
})();