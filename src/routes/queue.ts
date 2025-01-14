import { Hono } from 'hono';
import { Client, VoiceBasedChannel } from 'discord.js';
import { Player } from 'discord-player';

export const queue = (app: Hono, client: Client, player: Player, voiceStates: Map<string, { guild_id: string; channel_id: string }>) => {
    app.get("/queue", async (c) => {
        c.header("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN);
        c.header("Access-Control-Allow-Credentials", "true");
        const { user } = c.req.query() as { user: string };
        if (!user) {
            c.status(400);
            return c.json({ success: false, message: "No user provided" });
        }

        const state = voiceStates.get(user);
        if (!state) {
            c.status(404);
            return c.json({
                success: false,
                message: "User not in a voice channel",
            });
        }

        const channel = client.channels.cache.get(state.channel_id) as VoiceBasedChannel;
        const node = player.nodes.get(channel.guild);
        if (!node) {
            c.status(404);
            return c.json({
                success: false,
                message: "No queue found",
            });
        }

        const queue = node.tracks.data || [];
        const history = node.history.tracks.data || [];
        return c.json({ queue, history, success: true });
    });
};
