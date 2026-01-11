import {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    GuildMember,
    User,
    PermissionFlagsBits
} from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('action')
    .setDescription('Moderation action on a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
        option.setName('target')
            .setDescription('The user to perform action on')
            .setRequired(true));

export function getActionMenu(targetUser: User, targetMember: GuildMember | null) {
    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setThumbnail(targetUser.displayAvatarURL())
        .setDescription(`**— • Взаимодействие — ${targetUser.username}**\n\n` +
            `• **Пользователь**: ${targetUser} (${targetUser.tag})\n` +
            `• **Id**: ${targetUser.id}\n` +
            `• **Дата входа**: ${targetMember?.joinedAt ? targetMember.joinedAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Неизвестно'}`
        );

    const row1 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ban_btn')
                .setLabel('Забанить')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('warn_btn')
                .setLabel('Выдать варн')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('mute_btn')
                .setLabel('Заглушить')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('unban_btn')
                .setLabel('Разбанить')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('unwarn_btn')
                .setLabel('Снять варн')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('unmute_btn')
                .setLabel('Разглушить')
                .setStyle(ButtonStyle.Secondary)
        );

    return { embeds: [embed], components: [row1, row2] };
}

export async function execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const targetUser = interaction.options.getUser('target', true);
    const targetMember = interaction.options.getMember('target') as GuildMember;

    const menu = getActionMenu(targetUser, targetMember);
    await interaction.reply({ ...menu });
    const response = await interaction.fetchReply();

    // Component Collector to disable buttons after 1 minute
    const collector = response.createMessageComponentCollector({
        time: 60000
    });

    collector.on('collect', async (i) => {
        // Only the user who called the command should be able to interact
        if (i.user.id !== interaction.user.id) {
            await i.reply({ content: 'Это меню не для вас.', flags: 64 });
            return;
        }
    });

    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            try {
                // Disable all buttons in rows
                const disabledRows = menu.components.map(row => {
                    const newRow = ActionRowBuilder.from(row) as ActionRowBuilder<ButtonBuilder>;
                    newRow.components.forEach(btn => btn.setDisabled(true));
                    return newRow;
                });
                await interaction.editReply({ components: disabledRows });
            } catch (e) {
                // Message might be deleted
            }
        }
    });
}
