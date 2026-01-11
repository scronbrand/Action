import { Client, GatewayIntentBits, Events, Interaction, GuildMember, TextChannel, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, User, PermissionFlagsBits, StringSelectMenuInteraction } from 'discord.js';
import * as dotenv from 'dotenv';
import * as actionCommand from './commands/action';
import * as settingsCommand from './commands/settings';
import {
    createBanModal, createWarnModal, createMuteModal,
    createUnbanModal, createUnwarnModal, createUnmuteModal,
    createSettingsModal
} from './interactions/modals';
import { addPunishment, getWarnCount, removeLastWarn, clearWarns, getSettings, updateSettings } from './database';
import { logAction } from './logging';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once(Events.ClientReady, async (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    const commands = [actionCommand.data.toJSON(), settingsCommand.data.toJSON()];
    try {
        console.log('Started refreshing application (/) commands.');
        await c.application?.commands.set(commands);
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

async function checkPermissions(interaction: Interaction): Promise<boolean> {
    if (!interaction.guild || !interaction.member) return false;
    const member = interaction.member as GuildMember;

    // Admin check
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

    // Whitelist check
    const settings = getSettings(interaction.guildId!);
    const hasWhitelistRole = member.roles.cache.some(role => settings.whitelistRoles.includes(role.id));
    const isWhitelistedUser = settings.whitelistUsers.includes(member.id);

    if (!hasWhitelistRole && !isWhitelistedUser) {
        if (interaction.isRepliable()) {
            await interaction.reply({ content: 'У вас недостаточно прав для использования этой команды.', flags: MessageFlags.Ephemeral });
        }
        return false;
    }

    return true;
}

async function sendSuccessResponse(
    interaction: Interaction,
    type: 'ban' | 'warn' | 'mute' | 'unban' | 'unwarn' | 'unmute',
    target: User,
    moderator: User,
    reason: string,
    duration?: string
) {
    let title = '';
    let actionWord = 'выдали';
    let actionName = '';

    switch (type) {
        case 'ban': title = 'Выдача блокировки'; actionName = 'блокировку'; break;
        case 'warn': title = 'Выдача предупреждения'; actionName = 'варн'; break;
        case 'mute': title = 'Выдача заглушения'; actionName = 'заглушение'; break;
        case 'unban': title = 'Снятие блокировки'; actionWord = 'сняли'; actionName = 'блокировку'; break;
        case 'unwarn': title = 'Снятие предупреждения'; actionWord = 'сняли'; actionName = 'варн'; break;
        case 'unmute': title = 'Снятие заглушения'; actionWord = 'сняли'; actionName = 'заглушение'; break;
    }

    const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setThumbnail(target.displayAvatarURL())
        .setDescription(`**— • ${title} — ${target.username}**\n\n` +
            `${moderator}, Вы **${actionWord}** ${actionName} ${target}${duration ? ` на **${duration}**` : ''}\n\n` +
            `**| Причина:**\n` +
            `\`\`\`\n${reason}\n\`\`\``
        );

    const backButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`back_btn_${target.id}`)
            .setLabel('Назад')
            .setStyle(ButtonStyle.Secondary)
    );

    if (interaction.isModalSubmit()) {
        await interaction.reply({ embeds: [embed], components: [backButton] });
        setTimeout(async () => { try { await interaction.deleteReply(); } catch (e) { } }, 60000);
    } else if (interaction.isButton()) {
        await interaction.update({ embeds: [embed], components: [backButton] });
        setTimeout(async () => { try { await interaction.deleteReply(); } catch (e) { } }, 60000);
    }
}

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    // 1. Chat Input Command
    if (interaction.isChatInputCommand()) {
        if (!await checkPermissions(interaction)) return;
        if (interaction.commandName === 'action') {
            await actionCommand.execute(interaction);
        } else if (interaction.commandName === 'settings') {
            await settingsCommand.execute(interaction);
        }
    }
    // 2. Select Menu -> Handle Settings
    else if (interaction.isStringSelectMenu()) {
        if (!await checkPermissions(interaction)) return;
        if (interaction.customId === 'settings_select') {
            const value = interaction.values[0];
            switch (value) {
                case 'setup_ban_role':
                    await interaction.showModal(createSettingsModal('ban_role', 'Роль карантина', 'Введите ID роли'));
                    break;
                case 'setup_member_role':
                    await interaction.showModal(createSettingsModal('member_role', 'Роль участника', 'Введите ID роли'));
                    break;
                case 'setup_log_channel':
                    await interaction.showModal(createSettingsModal('log_channel', 'Канал уведомлений', 'Введите ID канала'));
                    break;
                case 'setup_max_warnings':
                    await interaction.showModal(createSettingsModal('max_warnings', 'Лимит варнов', 'Введите число'));
                    break;
                case 'whitelist_add_role':
                    await interaction.showModal(createSettingsModal('whitelist_add_role', 'Добавить группу', 'Введите ID роли'));
                    break;
                case 'whitelist_remove_role':
                    await interaction.showModal(createSettingsModal('whitelist_remove_role', 'Удалить группу', 'Введите ID роли'));
                    break;
                case 'whitelist_add_user':
                    await interaction.showModal(createSettingsModal('whitelist_add_user', 'Добавить в БС', 'Введите ID пользователя'));
                    break;
                case 'whitelist_remove_user':
                    await interaction.showModal(createSettingsModal('whitelist_remove_user', 'Удалить из БС', 'Введите ID пользователя'));
                    break;
            }
        }
    }
    // 3. Buttons -> Show Modals or Back
    else if (interaction.isButton()) {
        if (!await checkPermissions(interaction)) return;

        if (interaction.customId === 'back_to_protection') {
            const dashboard = settingsCommand.getSettingsDashboard(interaction.guild!);
            await interaction.update(dashboard);
            return;
        }

        if (interaction.customId.startsWith('back_btn_')) {
            const targetId = interaction.customId.replace('back_btn_', '');
            try {
                const targetUser = await client.users.fetch(targetId);
                const targetMember = await interaction.guild?.members.fetch(targetId).catch(() => null) || null;
                const menu = actionCommand.getActionMenu(targetUser, targetMember);
                const response = await interaction.update({ ...menu });
                const reply = await interaction.fetchReply();
                const collector = reply.createMessageComponentCollector({ time: 60000 });
                collector.on('collect', async (i) => { if (i.user.id !== interaction.user.id) await i.reply({ content: 'Это меню не для вас.', flags: MessageFlags.Ephemeral }); });
                collector.on('end', async (_, reason) => {
                    if (reason === 'time') {
                        try {
                            const disabledRows = menu.components.map(row => {
                                const newRow = ActionRowBuilder.from(row) as ActionRowBuilder<ButtonBuilder>;
                                newRow.components.forEach(btn => btn.setDisabled(true));
                                return newRow;
                            });
                            await interaction.editReply({ components: disabledRows });
                        } catch (e) { }
                    }
                });
            } catch (e) { await interaction.reply({ content: 'Ошибка при возврате в меню.', flags: MessageFlags.Ephemeral }); }
            return;
        }

        const embed = interaction.message.embeds[0];
        let targetId = '';
        if (embed && embed.description) {
            const match = embed.description.match(/Id\*\*:\s*(\d+)/);
            if (match) targetId = match[1];
        }

        if (!targetId) return;

        if (interaction.customId === 'ban_btn') await interaction.showModal(createBanModal(targetId));
        else if (interaction.customId === 'warn_btn') await interaction.showModal(createWarnModal(targetId));
        else if (interaction.customId === 'mute_btn') await interaction.showModal(createMuteModal(targetId));
        else if (interaction.customId === 'unban_btn') await interaction.showModal(createUnbanModal(targetId));
        else if (interaction.customId === 'unwarn_btn') await interaction.showModal(createUnwarnModal(targetId));
        else if (interaction.customId === 'unmute_btn') await interaction.showModal(createUnmuteModal(targetId));
    }
    // 4. Modals -> Execute Logic
    else if (interaction.isModalSubmit()) {
        const guildId = interaction.guildId!;
        const settings = getSettings(guildId);

        // a. Settings Modals
        if (interaction.customId.startsWith('settings_modal_')) {
            const type = interaction.customId.replace('settings_modal_', '');
            const value = interaction.fields.getTextInputValue('value');

            if (type === 'ban_role') updateSettings(guildId, { banRoleId: value });
            else if (type === 'member_role') updateSettings(guildId, { memberRoleId: value });
            else if (type === 'log_channel') updateSettings(guildId, { logChannelId: value });
            else if (type === 'max_warnings') updateSettings(guildId, { maxWarnings: parseInt(value) || settings.maxWarnings });
            else if (type === 'whitelist_add_role') {
                const roles = settings.whitelistRoles;
                if (!roles.includes(value)) roles.push(value);
                updateSettings(guildId, { whitelistRoles: roles });
            } else if (type === 'whitelist_remove_role') {
                updateSettings(guildId, { whitelistRoles: settings.whitelistRoles.filter(id => id !== value) });
            } else if (type === 'whitelist_add_user') {
                const users = settings.whitelistUsers;
                if (!users.includes(value)) users.push(value);
                updateSettings(guildId, { whitelistUsers: users });
            } else if (type === 'whitelist_remove_user') {
                updateSettings(guildId, { whitelistUsers: settings.whitelistUsers.filter(id => id !== value) });
            }

            const dashboard = settingsCommand.getSettingsDashboard(interaction.guild!);
            if (interaction.isFromMessage()) {
                await interaction.update(dashboard);
            } else {
                await interaction.reply({ ...dashboard, ephemeral: true });
            }
            return;
        }

        // b. Moderation Modals
        const [action, modalTargetId] = interaction.customId.split('_modal_');
        if (!action || !modalTargetId) return;

        let member: GuildMember | null = null;
        try { member = await interaction.guild?.members.fetch(modalTargetId) || null; } catch (e) { }
        const targetUser = member?.user || await client.users.fetch(modalTargetId).catch(() => null);
        if (!targetUser) { await interaction.reply({ content: 'Пользователь не найден.', flags: MessageFlags.Ephemeral }); return; }

        const reason = interaction.fields.getTextInputValue('reason') || 'Не указана';
        let duration = '';
        try { duration = interaction.fields.getTextInputValue('duration'); } catch (e) { }

        const moderator = interaction.user;

        try {
            if (action === 'ban') {
                if (member && settings.banRoleId) {
                    const rolesToRemove = member.roles.cache.filter(r => r.id !== interaction.guild!.id && r.managed === false);
                    await member.roles.remove(rolesToRemove);
                    await member.roles.add(settings.banRoleId);
                    clearWarns(modalTargetId);
                    addPunishment(modalTargetId, 'ban', reason);
                    await logAction(interaction.guild!, settings, 'ban', targetUser, moderator, reason, duration);
                    await sendSuccessResponse(interaction, 'ban', targetUser, moderator, reason, duration);
                } else { await interaction.reply({ content: 'Ошибка: Пользователь не найден или роль бана не настроена.', flags: MessageFlags.Ephemeral }); }
            }
            else if (action === 'warn') {
                addPunishment(modalTargetId, 'warn', reason);
                const currentWarns = getWarnCount(modalTargetId);
                await logAction(interaction.guild!, settings, 'warn', targetUser, moderator, reason);
                if (currentWarns >= settings.maxWarnings) {
                    if (member && settings.banRoleId) {
                        const rolesToRemove = member.roles.cache.filter(r => r.id !== interaction.guild!.id && r.managed === false);
                        await member.roles.remove(rolesToRemove);
                        await member.roles.add(settings.banRoleId);
                        clearWarns(modalTargetId);
                        addPunishment(modalTargetId, 'ban', `Auto-ban: Reached ${currentWarns} warnings.`);
                        await logAction(interaction.guild!, settings, 'ban', targetUser, moderator, `Авто-бан: Достигнут лимит предупреждений (${currentWarns}/${settings.maxWarnings})`);
                        await sendSuccessResponse(interaction, 'ban', targetUser, moderator, `Авто-бан: Достигнут лимит предупреждений (${currentWarns}/${settings.maxWarnings})`);
                    } else { await interaction.reply({ content: `Пользователь получил предупреждение (${currentWarns}/${settings.maxWarnings}). (Авто-бан не сработал)`, flags: MessageFlags.Ephemeral }); }
                } else { await sendSuccessResponse(interaction, 'warn', targetUser, moderator, reason, `Варны: ${currentWarns}/${settings.maxWarnings}`); }
            }
            else if (action === 'mute') {
                if (member) {
                    await member.timeout(60 * 60 * 1000, reason);
                    addPunishment(modalTargetId, 'mute', reason);
                    await logAction(interaction.guild!, settings, 'mute', targetUser, moderator, reason, duration);
                    await sendSuccessResponse(interaction, 'mute', targetUser, moderator, reason, duration);
                } else { await interaction.reply({ content: 'Пользователь не на сервере.', flags: MessageFlags.Ephemeral }); }
            }
            else if (action === 'unban') {
                if (member && settings.banRoleId && settings.memberRoleId) {
                    await member.roles.remove(settings.banRoleId);
                    await member.roles.add(settings.memberRoleId);
                    await logAction(interaction.guild!, settings, 'unban', targetUser, moderator, reason);
                    await sendSuccessResponse(interaction, 'unban', targetUser, moderator, reason);
                } else { await interaction.reply({ content: 'Ошибка: Роли не настроены.', flags: MessageFlags.Ephemeral }); }
            }
            else if (action === 'unwarn') {
                removeLastWarn(modalTargetId);
                await logAction(interaction.guild!, settings, 'unwarn', targetUser, moderator, reason);
                await sendSuccessResponse(interaction, 'unwarn', targetUser, moderator, reason);
            }
            else if (action === 'unmute') {
                if (member) {
                    await member.timeout(null, reason);
                    await logAction(interaction.guild!, settings, 'unmute', targetUser, moderator, reason);
                    await sendSuccessResponse(interaction, 'unmute', targetUser, moderator, reason);
                }
            }
        } catch (err: any) {
            console.error(err);
            if (!interaction.replied) await interaction.reply({ content: `Произошла ошибка: ${err.message}`, flags: MessageFlags.Ephemeral });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
