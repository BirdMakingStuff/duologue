# Duologue

Duologue sends posts and questions posted on Ed Discussion as a Discord message when they are posted.
It can also retrieve them when requested by the user.

> [!CAUTION]
> This branch contains the v2 release of Duologue, which is currently in development.

> [!CAUTION]
> The following notes are written for the v1 version of Duologue.

## Installation

[Create a new Discord application and bot and obtain its bot token and client ID.](https://discord.com/developers/applications)

Copy `config.toml.example` to `config.toml`, then fill in the required fields.

To run in development (build locally): "commands": "bun dist/deploy-commands.js",

```bash
docker compose -f docker-compose.dev.yml up --build
```

To run in production (pull from GitHub Container Registry):

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Usage

### `/ping`

Returns the ping of the bot.

### `/bind [course_id] [thread_type]`

> [!NOTE]
> This command requires the Administrator permission.

Binds the course with the given course ID to the channel which the command is run in.

**[course_id]**: The course ID of the course to be bound. For example, in the URL "https://edstem.org/au/courses/12345/discussion/", the course ID is 12345.

**[thread_type]:** The type of thread that the channel should be subscribed to: announcements (threads created by instructors) or normal (all other threads). Channels can be subscribed to both (you will have to run the command twice but change this parameter)

### `/unbind [course_id]`

> [!NOTE]
> This command requires the Administrator permission.

Unbinds the course with the given course ID from the channel which the command is run in. Note that for channels subscribed to both thread types, this will unsubscribe from both types.

**[course_id]**: The course ID of the course to be bound. For example, in the URL "https://edstem.org/au/courses/12345/discussion/", the course ID is 12345.

## Motivation

Whilst Ed Discussion is somewhat promoted within the university (dependent on lecturer), students do not check it often, prefering to use Discord instead for discussion related to their courses.

Additionally, Ed Discussion notifications are very slow to send out via email and not everyone wants to enable push notifications.

This bot intends to serve both of these use cases.
