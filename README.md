# Duologue

Duologue sends posts and questions posted on Ed Discussion as a Discord message when they are posted.
It can also retrieve them when requested by the user.

## Installation

[Create a new Discord application and bot and obtain its bot token and client ID.](https://discord.com/developers/applications)

Copy `config.toml.example` to `config.toml`, then fill in the required fields.

An Ed API token can be created at <https://edstem.org/au/settings/api-tokens>

> [!NOTE]
> The **API Tokens** section is hidden from the settings menu until you create your first token, so the link above is the only way to reach it initially.

### Registering commands with Discord

Before running the bot for the first time, you need to register
its slash commands with Discord:

```bash
npm install
npm run commands
```

> [!NOTE]
> Registering commands is a one-time setup step. The only time where
> re-running registration is needed is if commands are added, removed,
> or changed.

## Deployment

### Running with Docker

To run in development (build locally):

```bash
docker compose -f docker-compose.dev.yml up --build
```

To run in production (pull from GitHub Container Registry):

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Running with npm

Install dependencies and build:

```bash
npm install
npm run build
```

To run in production:

```bash
npm run start
```

## Usage

### `/ping`

Returns the ping of the bot.

### `/bind [course_id] [thread_type]`

> [!NOTE]
> This command requires the Administrator permission.

Binds the course with the given course ID to the channel which the command is run in.

**[course_id]**: The course ID of the course to be bound. For example, in the URL `https://edstem.org/au/courses/12345/discussion/`, the course ID is 12345.

**[thread_type]:** The type of thread that the channel should be subscribed to: announcements (threads created by instructors) or normal (all other threads). Channels can be subscribed to both (you will have to run the command twice but change this parameter)

### `/unbind [course_id]`

> [!NOTE]
> This command requires the Administrator permission.

Unbinds the course with the given course ID from the channel which the command is run in. Note that for channels subscribed to both thread types, this will unsubscribe from both types.

**[course_id]**: The course ID of the course to be bound. For example, in the URL `https://edstem.org/au/courses/12345/discussion/`, the course ID is 12345.

## Motivation

Whilst Ed Discussion is somewhat promoted within the university (dependent on lecturer), students do not check it often, prefering to use Discord instead for discussion related to their courses.

Additionally, Ed Discussion notifications are very slow to send out via email and not everyone wants to enable push notifications.

This bot intends to serve both of these use cases.
