require('dotenv').config()
const Discord = require('discord.js');
const yaml = require("js-yaml");
const fs = require("fs");
const client = new Discord.Client();

const { Readable } = require('stream');

const SILENCE_FRAME = Buffer.from([0xF8, 0xFF, 0xFE]);

class Silence extends Readable {
  _read() {
    this.push(SILENCE_FRAME);
  }
}

const { Transform } = require('stream')

function convertBufferTo1Channel(buffer) {
	const convertedBuffer = Buffer.alloc(buffer.length / 2)

	for (let i = 0; i < (convertedBuffer.length / 2)-1; i++) {
	  const uint16 = buffer.readUInt16LE(i * 4)
	  convertedBuffer.writeUInt16LE(uint16, i * 2)
	}

	return convertedBuffer
  }

class ConvertTo1ChannelStream extends Transform {
	constructor(source, options) {
	  super(options)
	}

	_transform(data, encoding, next) {
	  next(null, convertBufferTo1Channel(data))
	}
}

var prefix = "?";
var joined = false;

//ID of voice channel the bot is currently in.
var memberVoiceChannel;

//Name of the voice channel bot is currently in.
var currentChannelName = '';

// Imports the Google Cloud client library
const googleSpeech = require('@google-cloud/speech')
// Creates a client
const googleSpeechClient = new googleSpeech.SpeechClient()

client.once('ready', () => {
	lookatme = client.user;
	console.log('Ready!')
	client.guilds.cache.forEach(Guild => {
		let channels = Guild.channels.cache;
		for (let c of channels) {
			let channelType = c[1].type;
			if (channelType === "text") {
				channelID = c[0];
				break;
			}
		}
	});
});

client.on('message', async (msg) => {
	if (msg.content === prefix + "join") {
	  const member = msg.member
	  memberVoiceChannel = member.voice.channel;
	}
	if (!memberVoiceChannel) {
	  return
	}
	const channel = client.channels.cache.get(memberVoiceChannel.id);
	currentChannelName = memberVoiceChannel.name;
	await channel.join().then(connection => {
		console.log("Successfully connected.");
		if (joined) {
			return;
		}

		connection.play(new Silence(), { type: 'opus' });
		connection.on('speaking', (user, speaking) => {
			if (!speaking || !user) {
				return
			}
			joined = true;

			/* Create audio reciever for the followed user - 1/30/2021
				https://discordjs.guide/voice/receiving-audio.html#advanced-usage
			*/
			const audioStream = connection.receiver.createStream(user, { mode: 'pcm' })

			//console.log(`I'm listening to ${user.username}`)

			const requestConfig = {
				encoding: 'LINEAR16',
				sampleRateHertz: 48000,
				languageCode: 'en-US'
			}
			const request = {
				config: requestConfig,
				interimResults: false
			}

			// Stream the audio to the Google Cloud Speech API
			const recognizeStream = googleSpeechClient
			.streamingRecognize(request)
			.on('error', console.error)
			.on('data', data => {
				console.log(
				`${user.username}: ${data.results[0].alternatives[0].transcript}`
				);
				fs.appendFile("./output/transcript.md", `${user.username}:${data.results[0].alternatives[0].transcript}`, err => {
					if(err) {
						throw err;
					}
				});
			});
			const convertTo1ChannelStream = new ConvertTo1ChannelStream()
			audioStream.pipe(convertTo1ChannelStream).pipe(recognizeStream)
			audioStream.on('end', async () => {
				console.log(' ')
			})
		})
	})
})

try {
  const token = yaml.load(fs.readFileSync("./token.yaml", "UTF-8"));
  client.login(token.token);
} catch (e) {
  console.log(e);
}
