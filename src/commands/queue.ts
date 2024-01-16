import { CommandInteraction, GuildMember, VoiceBasedChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, ButtonInteraction, EmbedBuilder } from 'discord.js';
import { player } from '..';
import { colors } from '../types';

export const queueCommand = async (interaction: CommandInteraction) => {
    if (interaction.commandName === 'queue') {
        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice.channel as VoiceBasedChannel;

        if (!voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor(colors.Error)
                .setDescription('You need to be in a voice channel to view the queue!');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const node = player.nodes.get(voiceChannel.guild);
        if (!node) {
            const embed = new EmbedBuilder()
                .setColor(colors.Muusik)
                .setDescription('No music is currently playing in this server.');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const queue = node.tracks.data || [];
        if (queue.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(colors.Muusik)
                .setDescription('The queue is currently empty.');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(queue.length / itemsPerPage);
        const currentPage = 1;

        const queueContent = generateQueueContent(queue, currentPage, itemsPerPage);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('previous_queue_page')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 1),
                new ButtonBuilder()
                    .setCustomId('next_queue_page')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === totalPages)
            );

        const embed = new EmbedBuilder()
            .setColor(colors.Muusik)
            .setDescription(`Current queue (Page ${currentPage} of ${totalPages}):\n${queueContent}`);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
};

function generateQueueContent(queue: any[], page: number, itemsPerPage: number) {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return queue.slice(start, end).map((song, index) => `${start + index + 1}. ${song.title} requested by ${song.requestedBy}`).join('\n');
}

function extractCurrentPage(content: string): number {
    const match = content.match(/Page (\d+) of (\d+)/);
    return match ? parseInt(match[1], 10) : 1;
}


export async function handleQueuePagination(interaction: ButtonInteraction) {
    const currentPage = extractCurrentPage(interaction.message.content);
    const newPage = interaction.customId === 'next_queue_page' ? currentPage + 1 : currentPage - 1;

    const node = player.nodes.get(interaction.guildId || '');
    if (!node || !node.tracks.data) {
        await interaction.update({ content: 'No music is currently playing in this server.', components: [] });
        return;
    }

    const queue = node.tracks.data;
    const itemsPerPage = 10;
    const totalPages = Math.ceil(queue.length / itemsPerPage);

    const queueContent = generateQueueContent(queue, newPage, itemsPerPage);

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('previous_queue_page')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(newPage === 1),
            new ButtonBuilder()
                .setCustomId('next_queue_page')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(newPage === totalPages)
        );

    const embed = new EmbedBuilder()
        .setColor(colors.Muusik)
        .setDescription(`Current queue (Page ${newPage} of ${totalPages}):\n${queueContent}`);

    await interaction.update({
        embeds: [embed],
        components: [row]
    });
}