const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Embed,
  EmbedBuilder,
} = require("discord.js");

const { channelId } = require("../config.json");

const lobbies = {};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pug")
    .setDescription("Start a pug")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    let index = 0;
    const lobbyKeys = Object.keys(lobbies);
    while (lobbyKeys.map((k) => +k).includes(index)) {
      index++;
    }
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("join_" + index)
        .setLabel("Join")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("leave_" + index)
        .setLabel("Leave")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("rollcaptains_" + index)
        .setLabel("Roll Captains")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
    const currentLobby = [];

    const memberId = interaction.member.id;

    currentLobby.push(memberId);

    lobbies[index] = {
      lobby: currentLobby,
      message: null,
    };

    await interaction.guild.members.fetch();

    const members = await interaction.guild.members.cache;

    for (let k of lobbyKeys) {
      const mi = lobbies[k].lobby.findIndex((l) => l === memberId);
      if (mi > -1) {
        lobbies[k].lobby.splice(mi, 1);
        if (lobbies[k].lobby.length === 0 && lobbies[k].message) {
          await lobbies[k].message.delete();
          delete lobbies[k];
        } else {
          const newEmbed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(
              `Pug #${Object.keys(lobbies).length} (${currentLobby.length}/12)`
            )
            .setDescription(
              "Players: \n" +
                currentLobby.map((u) => members.get(u).displayName).join("\n")
            );
          lobbies[k].message.edit({
            embeds: [newEmbed],
          });
        }
        break;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(
        `Pug #${Object.keys(lobbies).length} (${currentLobby.length}/12)`
      )
      .setDescription(
        "Players: \n" +
          currentLobby.map((u) => members.get(u).displayName).join("\n")
      );

    await interaction.reply({ content: "OK", ephemeral: true });
    await interaction.deleteReply();

    const channel = interaction.guild.channels.cache.get(channelId);

    let message = await channel.send({
      embeds: [embed],
      components: [row],
    });

    lobbies[index].message = message;
  },
  lobbies,
};
