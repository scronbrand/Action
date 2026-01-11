import {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    Guild,
    MessageFlags
} from 'discord.js';
import { getSettings } from '../database';

export const data = new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure moderation and anti-nuke system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export function getSettingsDashboard(guild: Guild) {
    const settings = getSettings(guild.id);

    const maxLen = Math.max(settings.whitelistRoles.length, settings.whitelistUsers.length);
    let whitelistTable = '';
    if (maxLen === 0) {
        whitelistTable = '• Пусто \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0 • Пусто';
    } else {
        for (let i = 0; i < maxLen; i++) {
            const r = settings.whitelistRoles[i] ? `• <@&${settings.whitelistRoles[i]}>` : ' ';
            const u = settings.whitelistUsers[i] ? `• <@${settings.whitelistUsers[i]}>` : ' ';
            whitelistTable += `${r} \u00A0\u00A0\u00A0\u00A0 ${u}\n`;
        }
    }

    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setDescription(
            `**— • Анти-нюк система — ${guild.name}**\n\n` +
            `Здесь Вы можете посмотреть конфигурацию системы\n\n` +
            `**Основная информация:**\n` +
            `• Роль карантина: ${settings.banRoleId ? `<@&${settings.banRoleId}>` : '`Не настроено`'}\n` +
            `• Роль участника: ${settings.memberRoleId ? `<@&${settings.memberRoleId}>` : '`Не настроено`'}\n` +
            `• Канал уведомлений: ${settings.logChannelId ? `<#${settings.logChannelId}>` : '`Не настроено`'}\n` +
            `• Кол-во предупреждений: **${settings.maxWarnings}**\n\n` +
            `**| Группы: \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0 | Белый список:**\n` +
            whitelistTable
        );

    // Note: The two-column layout above is a best effort. 
    // If there are multiple items, it gets complicated. 
    // I'll stick to a clean list for now unless I find a better way.

    const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('settings_select')
            .setPlaceholder('Выберите, что хотите сделать...')
            .addOptions([
                { label: 'Роль карантина', value: 'setup_ban_role', description: 'Установить роль для забаненных' },
                { label: 'Роль участника', value: 'setup_member_role', description: 'Установить роль для обычных участников' },
                { label: 'Канал логов', value: 'setup_log_channel', description: 'Установить канал для уведомлений' },
                { label: 'Лимит варнов', value: 'setup_max_warnings', description: 'Установить лимит предупреждений' },
                { label: 'Добавить группу (Роль)', value: 'whitelist_add_role', description: 'Добавить роль в вайтлист' },
                { label: 'Удалить группу (Роль)', value: 'whitelist_remove_role', description: 'Удалить роль из вайтлиста' },
                { label: 'Добавить в белый список (Юзер)', value: 'whitelist_add_user', description: 'Добавить пользователя в вайтлист' },
                { label: 'Удалить из белого списка (Юзер)', value: 'whitelist_remove_user', description: 'Удалить пользователя из вайтлиста' },
            ])
    );

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('back_to_protection')
            .setLabel('Вернуться к выбору защиты')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('status_dot')
            .setLabel('.') // Changed from ' ' to '.' to avoid DiscordAPIError
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
    );

    return { embeds: [embed], components: [selectMenu, buttons] };
}

export async function execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;
    const dashboard = getSettingsDashboard(interaction.guild!);
    await interaction.reply({ ...dashboard, ephemeral: true });
}
