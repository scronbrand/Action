import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Guild, TextChannel, User } from 'discord.js';

export async function logAction(
    guild: Guild,
    settings: { logChannelId: string | null },
    type: 'ban' | 'warn' | 'mute' | 'unban' | 'unwarn' | 'unmute',
    target: User,
    moderator: User,
    reason: string,
    duration?: string
) {
    if (!settings.logChannelId) return;

    const channel = guild.channels.cache.get(settings.logChannelId) as TextChannel;
    if (!channel) return;

    let actionName = '';
    let color = 0x2b2d31;

    switch (type) {
        case 'ban': actionName = 'Выдача блокировки'; break;
        case 'warn': actionName = 'Выдача предупреждения'; break;
        case 'mute': actionName = 'Выдача заглушения'; break;
        case 'unban': actionName = 'Снятие блокировки'; break;
        case 'unwarn': actionName = 'Снятие предупреждения'; break;
        case 'unmute': actionName = 'Снятие заглушения'; break;
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: 'Moderation', iconURL: 'https://cdn.discordapp.com/emojis/1046067755866980393.webp' })
        .setTitle(`— • ${actionName}`)
        .addFields(
            {
                name: '| Пользователь:',
                value: `· ${moderator}\n· ${moderator.username}\n· ${moderator.id}`,
                inline: true
            },
            {
                name: '| Нарушитель:',
                value: `· ${target}\n· ${target.username}\n· ${target.id}`,
                inline: true
            },
            {
                name: '| Причина:',
                value: `\`\`\`\n${reason}\n\`\`\``,
                inline: false
            }
        );

    if (duration) {
        // footer for punishment expiry
        embed.setFooter({ text: `Наказание будет снято` });
        embed.setTimestamp(); // This shows current time, usually fine or we could set to expiry if we knew it.
        // For now, let's just set the footer text as in screenshot.
    }

    await channel.send({ embeds: [embed] });
}
