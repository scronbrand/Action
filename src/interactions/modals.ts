import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export function createBanModal(targetId: string) {
    const modal = new ModalBuilder()
        .setCustomId(`ban_modal_${targetId}`)
        .setTitle('Выдать бан');

    const durationInput = new TextInputBuilder()
        .setCustomId('duration')
        .setLabel('Длительность (например: 1d, 2h)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Причина')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(durationInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
    );

    return modal;
}

export function createWarnModal(targetId: string) {
    const modal = new ModalBuilder()
        .setCustomId(`warn_modal_${targetId}`)
        .setTitle('Выдать варн');

    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Причина')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
    );

    return modal;
}

export function createMuteModal(targetId: string) {
    const modal = new ModalBuilder()
        .setCustomId(`mute_modal_${targetId}`)
        .setTitle('Заглушить');

    const durationInput = new TextInputBuilder()
        .setCustomId('duration')
        .setLabel('Длительность (например: 1h, 30m)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true); // Mute usually requires time, or infinite? Let's say required.

    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Причина')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(durationInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
    );

    return modal;
}

export function createUnbanModal(targetId: string) {
    const modal = new ModalBuilder()
        .setCustomId(`unban_modal_${targetId}`)
        .setTitle('Снять бан');

    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Причина')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
    );

    return modal;
}

export function createUnwarnModal(targetId: string) {
    const modal = new ModalBuilder()
        .setCustomId(`unwarn_modal_${targetId}`)
        .setTitle('Снять варн');

    // Usually unwarn takes an ID of warn, but "remove last" is requested.
    // Maybe reasoning for removal?
    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Причина (необязательно)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
    );

    return modal;
}

export function createUnmuteModal(targetId: string) {
    const modal = new ModalBuilder()
        .setCustomId(`unmute_modal_${targetId}`)
        .setTitle('Снять мут');

    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Причина')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
    );

    return modal;
}

export function createSettingsModal(type: string, title: string, label: string) {
    const modal = new ModalBuilder()
        .setCustomId(`settings_modal_${type}`)
        .setTitle(title);

    const input = new TextInputBuilder()
        .setCustomId('value')
        .setLabel(label)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    return modal;
}
