const Discord = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');

// const auth = require('./token.json');
const client = new Discord.Client();


var prefix = "z!";
try {
    const token = yaml.load(fs.readFileSync('./token.yaml', "UTF-8"));
    client.login(token.token);
} catch (e) {
    console.log(e);
}

//Important (initializes bot)
client.once('ready', () => {
    console.log('Ready!');
});


const regCMD = new RegExp(prefix + "(.*)");

client.on('message', msg => {
    if (regCMD.test(msg)) {
        const match = msg.content.match(regCMD);//array of regex match
    }
    else {
        console.log(msg.author.username + ": " + msg);
        console.log("🚀");
    }
});
