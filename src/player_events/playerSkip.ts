import { player, updates, updatesTimeout } from '..';

export function playerSkip() {
    player.events.on('playerSkip', (queue) => {
        const queueUpdates = updates.get(queue.guild.id);
        updates.set(queue.guild.id, {
            track: true,
            volume: queueUpdates?.volume || false,
            queue: queueUpdates?.queue || false,
            paused: queueUpdates?.paused || false,
        });
        clearTimeout(updatesTimeout.get(queue.guild.id)!);
        updatesTimeout.set(queue.guild.id, setTimeout(() => {
            updates.delete(queue.guild.id);
        }, 10000));
    });
}