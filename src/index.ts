import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { ActivityType, Client, GatewayIntentBits, REST } from "discord.js";
import { Player } from 'discord-player';
import * as routeHandlers from './routes/index';
import { interactionManager } from './modules/interactionManager';
import axios from 'axios';

export const client = new Client({
    intents: [
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ],
});

export const player = new Player(client);
player.extractors.loadDefault();
export const voiceStates = new Map<string, { guild_id: string; channel_id: string }>();
export const updates = new Map<string, { track: boolean; volume: boolean; queue: boolean; paused: boolean; }>();
export let onlineSince: number;

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.member && newState.channelId) {
        if(!client.guilds.cache.get(newState.guild.id)) await client.guilds.fetch()
        if(!client.users.cache.get(newState.member.user.id)) await client.users.fetch(newState.member.user.id)
        voiceStates.set(newState.member.user.id, {
            guild_id: newState.guild.id,
            channel_id: newState.channelId,
        });
    } else if (oldState.member) {
        if(!client.guilds.cache.get(oldState.guild.id)) await client.guilds.fetch()
        if(!client.users.cache.get(oldState.member.user.id)) await client.users.fetch(oldState.member.user.id)
        if (oldState.member.user.id) {
            voiceStates.delete(oldState.member.user.id);
        }
    }
});

client.on('ready', async () => {
    console.log(player.scanDeps());
    onlineSince = Date.now();

    client.user?.setPresence({
        activities: [{
            name: "music for everyone",
            type: ActivityType.Streaming,
            url: "https://twitch.tv/jxtq",
        }],
    });
    if(process.env.TOPGG_TOKEN && process.env.TOPGG_TOKEN !== "TOPGG_TOKEN") {
        await axios.post(`https://top.gg/api/bots/${process.env.CLIENT_ID}/stats`, {
            server_count: client.guilds.cache.size,
        },
        {
            headers: {
                Authorization: process.env.TOPGG_TOKEN,
            },
        })
    }
});

client.on('interactionCreate', async (interaction) => {
    await interactionManager.handleInteraction(interaction);
});

const token = process.env.TOKEN;

if (!token) {
    throw new Error("TOKEN is not defined in the environment variables");
}

const app = new Hono();

const dev = process.env.NODE_ENV !== 'production';

app.get("/", (c) => c.redirect("https://muusik.app"));
routeHandlers.auth_type(app, dev);
routeHandlers.check_permissions(app, client);
routeHandlers.check_playing(app, client, voiceStates, player);
routeHandlers.current_song(app, client, voiceStates, player);
routeHandlers.find_song(app);
routeHandlers.findUser(app, client, voiceStates);
routeHandlers.get_playlinks(app);
routeHandlers.get_roles(app, client);
routeHandlers.get_user(app, client);
routeHandlers.pause(app, client, voiceStates, player);
routeHandlers.play(app, client, voiceStates, player);
routeHandlers.playlist(app, client, voiceStates, player, dev);
routeHandlers.queue(app, client, player, voiceStates);
routeHandlers.scrobble(app);
routeHandlers.session_type(app);
routeHandlers.skip(app, client, voiceStates, player);
routeHandlers.song_info(app);
routeHandlers.shuffle(app, client, voiceStates, player, updates);
routeHandlers.get_owner(app, client, voiceStates);
routeHandlers.volume(app, player, voiceStates);
routeHandlers.updates(app, voiceStates, updates);

const port = Number(process.env.PORT || 8000);
serve({ port, fetch: app.fetch });
console.log(`Server listening on port ${port}`);

client.login(process.env.TOKEN);

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

player.on('error', (error) => {
    console.error('Player Error:', error);
});

player.events.on('playerStart', (queue, track) => {
    const queueUpdates = updates.get(queue.guild.id);
    updates.set(queue.guild.id, {
        track: true,
        volume: queueUpdates?.volume || false,
        queue: queueUpdates?.queue || false,
        paused: queueUpdates?.paused || false,
    });
    setTimeout(() => {
        updates.delete(queue.guild.id);
    }, 10000);
});

player.events.on('audioTrackAdd', (queue, track) => {
    const queueUpdates = updates.get(queue.guild.id);
    updates.set(queue.guild.id, {
        track: queueUpdates?.track || false,
        volume: queueUpdates?.volume || false,
        queue: true,
        paused: queueUpdates?.paused || false,
    });
    setTimeout(() => {
        updates.delete(queue.guild.id);
    }, 10000);
});

player.events.on('audioTracksAdd', (queue, tracks) => {
    const queueUpdates = updates.get(queue.guild.id);
    updates.set(queue.guild.id, {
        track: queueUpdates?.track || false,
        volume: queueUpdates?.volume || false,
        queue: true,
        paused: queueUpdates?.paused || false,
    });
    setTimeout(() => {
        updates.delete(queue.guild.id);
    }, 10000);
});

player.events.on('playerPause', (queue) => {
    const queueUpdates = updates.get(queue.guild.id);
    updates.set(queue.guild.id, {
        track: queueUpdates?.track || false,
        volume: queueUpdates?.volume || false,
        queue: queueUpdates?.queue || false,
        paused: true,
    });
    setTimeout(() => {
        updates.delete(queue.guild.id);
    }, 10000);
});

player.events.on('playerResume', (queue) => {
    const queueUpdates = updates.get(queue.guild.id);
    updates.set(queue.guild.id, {
        track: queueUpdates?.track || false,
        volume: queueUpdates?.volume || false,
        queue: queueUpdates?.queue || false,
        paused: false,
    });
    setTimeout(() => {
        updates.delete(queue.guild.id);
    }, 10000);
});

player.events.on('volumeChange', (queue, volume) => {
    const queueUpdates = updates.get(queue.guild.id);
    updates.set(queue.guild.id, {
        track: queueUpdates?.track || false,
        volume: true,
        queue: queueUpdates?.queue || false,
        paused: queueUpdates?.paused || false,
    });
    setTimeout(() => {
        updates.delete(queue.guild.id);
    }, 10000);
});

player.events.on('playerFinish', (queue) => {
    const queueUpdates = updates.get(queue.guild.id);
    updates.set(queue.guild.id, {
        track: true,
        volume: queueUpdates?.volume || false,
        queue: queueUpdates?.queue || false,
        paused: queueUpdates?.paused || false,
    });
    setTimeout(() => {
        updates.delete(queue.guild.id);
    }, 10000);
});

player.events.on('playerSkip', (queue) => {
    const queueUpdates = updates.get(queue.guild.id);
    updates.set(queue.guild.id, {
        track: true,
        volume: queueUpdates?.volume || false,
        queue: queueUpdates?.queue || false,
        paused: queueUpdates?.paused || false,
    });
    setTimeout(() => {
        updates.delete(queue.guild.id);
    }, 10000);
});