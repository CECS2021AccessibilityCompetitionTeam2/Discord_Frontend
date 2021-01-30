const Discord = require("discord.js");
const yaml = require("js-yaml");
const fs = require("fs");

const client = new Discord.Client();

var prefix = "z!";
try {
  const token = yaml.load(fs.readFileSync("./token.yaml", "UTF-8"));
  client.login(token.token);
} catch (e) {
  console.log(e);
}

function introMessage() {
  console.log(`
  *** This Bot is ready to play! ***
  !listen -> join the voice chanel
  `);
}

//Important (initializes bot)
client.once("ready", introMessage.bind(this));

const regCMD = new RegExp(prefix + "(.*)");


client.on("message", discordMessage.bind(this));

function discordMessage(msg){
  let discordCommand = msg.content.toLowerCase().slice(1);
  switch (discordCommand) {
    case 'hello' : 
      msg.reply(`Hello ${msg.author.username}`);
      break;
    case 'listen' : 
      textChannel = msg.channel;
      msg.reply(`Going to listen to voice channel`);
      listenToVoiceChannel(msg);
  }
}

function listenToVoiceChannel(voice) {
  let voiceMember = voice.member;
  let listening = true;
}