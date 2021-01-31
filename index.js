require('dotenv').config()
const Discord = require('discord.js');
const yaml = require("js-yaml");
const fs = require("fs");
const client = new Discord.Client();

// Imports the Google Cloud client library
const googleSpeech = require('@google-cloud/speech')
// Creates a client
const googleSpeechClient = new googleSpeech.SpeechClient()

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

  for (let i = 0; i < convertedBuffer.length / 2; i++) {
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
var followingUser = '';
var defaultChannel = '';

client.once('ready', () => {
  console.log('Ready!')
  client.guilds.cache.forEach(Guild => {
    let channelID;
    let channels = Guild.channels.cache;
    for (let c of channels) {
      let channelType = c[1].type;
      if (channelType === "text") {
        channelID = c[0];
        break;
      }
    }
    defaultChannel = channels.get(Guild.systemChannelID || channelID);
    //defaultChannel.send("PING PONG I AM ONLINE!");
  });
});

client.on('message', msg => {
  if (msg.content === prefix + 'followme') {
    followingUser = msg.member.user.id;
    console.log("Following user: " + followingUser);
  }
})

client.on('voiceStateUpdate', async (oldMember, newMember) => {
  let newUserChannel = newMember.channelID;
  let oldUserChannel = oldMember.channelID;
  console.log(`
    ****USER VOICE CHANNEL STATE CHANGE!****
    user: ${oldMember.id}
    previous: ${oldMember.channelID}
    new channel: ${+ newMember.channelID}
  `);
  if (newMember.id === followingUser) {
    if ((oldUserChannel === undefined && newUserChannel !== undefined)
      || (oldUserChannel !== undefined && newUserChannel !== undefined && oldUserChannel !== newUserChannel)) {
      // User Joins a voice channel
	  console.log("Joined " + newUserChannel);
	  const channel = client.channels.cache.get(newUserChannel);
		if (!channel) {
			return console.error("The channel does not exist!");
		}
		await channel.join().then(connection => {
			console.log("Successfully connected.");

			/* Create audio reciever for the followed user - 1/30/2021
				https://discordjs.guide/voice/receiving-audio.html#advanced-usage
			*/
			const audio = connection.receiver.createStream(followingUser, { mode: 'opus' });

      		// defaultChannel.send("I am listening to you");
      		// connection.play(followingUser, { type: 'opus' });
      		connection.on('speaking', (user, speaking) => {
				if (!speaking) {
					return
				}
				console.log(`I'm listening to ${user.username}`)

				// this creates a 16-bit signed PCM, stereo 48KHz stream
				const requestConfig = {
					encoding: 'LINEAR16',
					sampleRateHertz: 48000,
					languageCode: 'en-US'
				}
				const request = {
					config: requestConfig,
					interimResults: false,
				}


				// Stream the audio to the Google Cloud Speech API
				const recognizeStream = googleSpeechClient
				.streamingRecognize(request)
				.on('error', console.error)
				.on('data', data => {
					console.log(data)
					console.log(
					`Transcription: ${data.results[0].alternatives[0].transcript}`
					);
				});
				const convertTo1ChannelStream = new ConvertTo1ChannelStream()
				audio.pipe(convertTo1ChannelStream).pipe(recognizeStream)

				audio.on('end', async () => {
					console.log('audioStream end')
				})
      		});
		}).catch(e => {
			console.error(e);
		});
    } else if (newUserChannel === undefined) {
      console.log("User left the channel");
      channel.leave();
      // User leaves a voice channel
    }
  }
})

try {
  const token = yaml.load(fs.readFileSync("./token.yaml", "UTF-8"));
  client.login(token.token);
} catch (e) {
  console.log(e);
}



