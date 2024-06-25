# duologue

Duologue sends posts and questions posted on Ed Discussion as a Discord message when they are posted.
It can also retrieve them when requested by the user.

## Installation
[Create a new Discord application and bot and obtain it's private key and client ID.](https://discord.com/developers/applications)

Create a `.env` file which contains the private key as `DISCORD_TOKEN` and the client ID as `DISCORD_CLIENT_ID`. The polling duration also must be specified as `POLLING_INTERVAL`.

In the `ed` directory, create a `ed-tokens.json` file. The keys of a file should be the course IDs available to be subscribed to, and the values are the Ed API tokens obtained from [Ed Settings](https://edstem.org/au/settings/api-tokens). For example:

```json
{
    "12345": "<YOUR_ED_API_TOKEN_HERE>",
    "12346": "<YOUR_ED_API_TOKEN_HERE>",
}
```

Note that you may have to change

Finally, run the bot with `npm start`.

## Usage

Note that you must have the Administrator permission in order to run these commands.

### `/ping`
Returns the ping of the bot.

### `/bind [course_id] [thread_type]`
Binds the course with the given course ID to the channel which the command is run in.

**[course_id]**: The course ID of the course to be bound. For example, in the URL "https://edstem.org/au/courses/12345/discussion/", the course ID is 12345.

**[thread_type]:** The type of thread that the channel should be subscribed to: announcements (threads created by instructors) or normal (all other threads). Channels can be subscribed to both (you will have to run the command twice but change this parameter)

### `/unbind [course_id]`
Unbinds the course with the given course ID from the channel which the command is run in. Note that for channels subscribed to both thread types, this will unsubscribe from both types.

**[course_id]**: The course ID of the course to be bound. For example, in the URL "https://edstem.org/au/courses/12345/discussion/", the course ID is 12345.

## Motivation

Whilst Ed Discussion is somewhat promoted within the university (dependent on lecturer), students do not check it often, prefering to use Discord instead for discussion related to their courses.

Additionally, Ed Discussion notifications are very slow to send out via email and not everyone wants to enable push notifications.

This bot intends to serve both of these use cases.