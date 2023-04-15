const {
  Events,
  EmbedBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
} = require("discord.js");
const { lobbies } = require("../commands/pug");
const lobbyLogs = require("../lobby_logs.json");
const userIds = require("../user_ids.json");
const fs = require("node:fs");
const { request } = require("undici");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isButton()) return;

    const embed = new EmbedBuilder().setColor(0x0099ff);

    const indices = [];

    const lobbyIndex = interaction.customId[interaction.customId.length - 1];

    const currentLobby = lobbies[lobbyIndex].lobby;

    if (
      interaction.customId.includes("join") &&
      currentLobby.findIndex((c) => c === interaction.user.id) === -1
    ) {
      currentLobby.push(interaction.user.id);
    } else if (
      interaction.customId.includes("leave") &&
      currentLobby.findIndex((c) => c === interaction.user.id) > -1
    ) {
      currentLobby.splice(
        currentLobby.findIndex((c) => c === interaction.user.id),
        1
      );
    } else if (
      interaction.customId.includes("rollcaptains") &&
      currentLobby.length >= 12
    ) {
      while (indices.length < 2) {
        const logs = lobbyLogs.lobbies.sort((a, b) =>
          a.logId.localeCompare(b.logId)
        );
        const maybeIndex = Math.floor(Math.random() * currentLobby.length);
        if (
          !indices.includes(maybeIndex) &&
          !logs
            .splice(0, 2)
            .some((l) => l.captains.includes(currentLobby[maybeIndex]))
        ) {
          indices.push(maybeIndex);
        }
      }
    }

    await interaction.guild.members.fetch();

    const members = await interaction.guild.members.cache;

    embed
      .setTitle(`Pug #1 (${currentLobby.length}/12)`)
      .setDescription(
        currentLobby.length > 0
          ? "Players: \n" +
              currentLobby.map((u) => members.get(u).displayName).join("\n")
          : "No players in lobby."
      );

    if (indices.length > 1) {
      embed.addFields({
        name: "Captains",
        value: currentLobby[indices[0]] + " & " + currentLobby[indices[1]],
      });

      lobbyLogs.lobbies.push({
        captains: indices.map((i) => currentLobby[i]),
        lobby: currentLobby,
        logId: null,
      });

      pollLogs(currentLobby, Date.now(), 3000);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("join_" + lobbyIndex)
        .setLabel("Join")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("leave_" + lobbyIndex)
        .setLabel("Leave")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("rollcaptains_" + lobbyIndex)
        .setLabel("Roll Captains")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentLobby.length < 12)
    );

    await interaction.update({
      embeds: [embed],
      components: [row],
    });

    if (lobbies[lobbyIndex].lobby.length === 0 && lobbies[lobbyIndex].message) {
      await lobbies[lobbyIndex].message.delete();
      delete lobbies[lobbyIndex];
    }
  },
};

function pollLogs(lobby, timeLobbyStarted, timeToPoll) {
  setTimeout(async () => {
    const data = await request(
      `https://logs.tf/api/v1/log?limit=5&player=${getSteamIdFromDiscordId(
        lobby.captains[0]
      )}`
    );

    const jsonData = [...(await data.body.json())];

    if (jsonData.logs.length > 0) {
      const logsAfterLobbyStart = jsonData.find(
        (d) => d.date > timeLobbyStarted
      );

      if (logsAfterLobbyStart) {
        setLobbyLogId(lobby.id, logsAfterLobbyStart.id);
      } else {
        pollLogs(playerId, timeLobbyStarted, 300000);
      }
    }
  }, timeToPoll);
}

function setLobbyLogId(lobbyId, logId) {
  const lobby = lobbyLogslobbies.find((l) => l.id === lobbyId);

  if (!lobby) return;

  lobby.logId = logId;

  fs.writeFileSync("lobby_logs.json", JSON.stringify(lobbyLogs));
}

function getSteamIdFromDiscordId(discordId) {
  const user = userIds.idPairs.find((d) => d.discordId === discordId);

  if (!user) return null;

  return user.steamId;
}
