import {
    SlashCommandBuilder,
    CommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType
} from 'discord.js';
import { getSettings, updateSettings } from '../database';

export const data = new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure moderation settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
        sub.setName('roles')
            .setDescription('Set ban and member roles')
            .addRoleOption(opt => opt.setName('ban_role').setDescription('Role for banned users'))
            .addRoleOption(opt => opt.setName('member_role').setDescription('Role for regular members')))
    .addSubcommand(sub =>
        sub.setName('logs')
            .setDescription('Set log channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel for moderation logs').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(sub =>
        sub.setName('max_warnings')
            .setDescription('Set max warnings before auto-ban')
            .addIntegerOption(opt => opt.setName('count').setDescription('Number of warnings').setMinValue(1)))
    .addSubcommand(sub =>
        sub.setName('whitelist')
            .setDescription('Manage whitelisted roles allowed to use moderation commands')
            .addRoleOption(opt => opt.setName('role').setDescription('Role to add/remove').setRequired(true))
            .addStringOption(opt => opt.setName('action').setDescription('Action to perform').setRequired(true).addChoices(
                { name: 'Add', value: 'add' },
                { name: 'Remove', value: 'remove' }
            )));

export async function execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    if (subcommand === 'roles') {
        const banRole = interaction.options.getRole('ban_role');
        const memberRole = interaction.options.getRole('member_role');

        const updates: any = {};
        if (banRole) updates.banRoleId = banRole.id;
        if (memberRole) updates.memberRoleId = memberRole.id;

        updateSettings(guildId, updates);
        await interaction.reply({ content: 'Настройки ролей обновлены.', ephemeral: true });
    }
    else if (subcommand === 'logs') {
        const channel = interaction.options.getChannel('channel');
        if (channel) {
            updateSettings(guildId, { logChannelId: channel.id });
            await interaction.reply({ content: `Канал логов установлен: ${channel}`, ephemeral: true });
        }
    }
    else if (subcommand === 'max_warnings') {
        const count = interaction.options.getInteger('count');
        if (count !== null) {
            updateSettings(guildId, { maxWarnings: count });
            await interaction.reply({ content: `Лимит предупреждений установлен на ${count}.`, ephemeral: true });
        }
    }
    else if (subcommand === 'whitelist') {
        const role = interaction.options.getRole('role', true);
        const action = interaction.options.getString('action', true);

        const settings = getSettings(guildId);
        let whitelist = settings.whitelistRoles;

        if (action === 'add') {
            if (!whitelist.includes(role.id)) whitelist.push(role.id);
        } else {
            whitelist = whitelist.filter(id => id !== role.id);
        }

        updateSettings(guildId, { whitelistRoles: whitelist });
        await interaction.reply({ content: `Роль ${role.name} ${action === 'add' ? 'добавлена в' : 'удалена из'} вайтлиста.`, ephemeral: true });
    }
}
