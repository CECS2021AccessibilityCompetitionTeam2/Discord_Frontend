require('dotenv').config()
const Discord = require('discord.js');
const yaml = require("js-yaml");
const fs = require("fs");
const client = new Discord.Client();

const { Readable } = require('stream');

// "blank" noise generator
const SILENCE_FRAME = Buffer.from([0xF8, 0xFF, 0xFE]);
class Silence extends Readable {
	_read() {
		this.push(SILENCE_FRAME);
	}
}

// Stream buffer
const { Transform } = require('stream')
function convertBufferTo1Channel(buffer) {
	const convertedBuffer = Buffer.alloc(buffer.length / 2)
	for (let i = 0; i < (convertedBuffer.length / 2) - 1; i++) {
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
// used as a flag for changes in the .md file
var changesToTxt = false;

// ID of voice channel the bot is currently in.
var memberVoiceChannel;

// Name of the voice channel bot is currently in.
var currentChannelName = '';

// Imports the Google Cloud client library
const googleSpeech = require('@google-cloud/speech')
// Creates a client
const googleSpeechClient = new googleSpeech.SpeechClient()

client.once('ready', () => {
	console.log('Ready!')
	// Updated as of 2/5/2020, now guilds.cache instead of just guilds
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
	// Wait for "?join" to be typed in chat
	if (msg.content === prefix + "join") {
		// Obtain the issuer of the command
		const member = msg.member
		// Obtain the ID of the voice channel the issuer is in
		memberVoiceChannel = member.voice.channel;
		// Check if the issuer is in fact, in a voice channel
		if (!memberVoiceChannel) {
			msg.channel.send("Please join a voice channel to begin transcription.")
			return
		}
	}

	// From the voice channel ID, obtain the name of the channel
	const channel = client.channels.cache.get(memberVoiceChannel.id);
	currentChannelName = memberVoiceChannel.name;
	await channel.join().then(connection => {
		console.log("Successfully connected.");
		if (joined) {
			return;
		}

		// Emit "blank" noise so that the bot can begin receiving audio.
		connection.play(new Silence(), { type: 'opus' });
		connection.on('speaking', (user, speaking) => {
			if (!speaking || !user) {
				return
			}
			// Update state of the bot once it is ready and receiving audio
			joined = true;

			/* Create audio reciever for the speaker - 1/30/2021
				https://discordjs.guide/voice/receiving-audio.html#advanced-usage
			*/
			const audioStream = connection.receiver.createStream(user, { mode: 'pcm' })
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
					// Output data to terminal
					console.log(
						`${user.username}: ${data.results[0].alternatives[0].transcript}`
					);
					// Write data to an .md file to be processed by the NLP
					fs.appendFile("./output/transcript.md", `${user.username}:${data.results[0].alternatives[0].transcript}\n`, err => {
						if (err) {
							throw err;
						}
						changesToTxt = true;
					});
				});
			const convertTo1ChannelStream = new ConvertTo1ChannelStream()
			audioStream.pipe(convertTo1ChannelStream).pipe(recognizeStream)
			audioStream.on('end', async () => {
				console.log(' ')
			})
		})
	});
	if (msg.content === '!asl') {
		changesToTxt = false;
		console.log('!asl')
		if (!changesToTxt) {
			msg.channel.send("Please say what you would like to be transcribed.")
		} else {
			// Write '!asl' to the file so that the .py script can translate the following line
			fs.appendFile("./output/transcript.md", '!asl\n', err => {
			if (err) {
				throw err;
			}
			});
			// Create the attachment using MessageAttachment
			const attachment = new Discord.MessageAttachment("./output/video.mp4");
			// Send the local attachment in the message channel with a content
			msg.channel.send(msg.author, attachment)
			.catch(console.error);
		}
	}
})

try {
	const token = yaml.load(fs.readFileSync("./token.yaml", "UTF-8"));
	client.login(token.token);
} catch (e) {
	console.log(e);
}
