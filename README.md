# CSUN Accessibility Coding Competition 2021 
Created a discord bot that actively listens to speech and ultimately transcribes this speech into American Sign Language via video inside of a Discord server chat.

## Goals of the project
1. Create an efficient way for the bot to actively listen when invoked
2. Accurately transcribe this audio into a text based format, using Google Cloud Speech
3. Process the text on the backend, convert into the proper ASL sentence structure
4. With ASL formatting achieved, using a web scraper and the ASL Dictionary, find the correct sign language video that corresponds to the correct text
5. Bot then sends back the proper video demonstrating ASL inside the Discord Chat, thus achieving an accurate translation

## Resources and Languages used
1. Nodejs, Python, Bash
2. Discord API - Discordjs
3. Google Cloud Speech-to-Text

## Simple User Functionality
1. Use '!join' to have the bot join the voice channel
2. Use '!asl' to invoke the command to translate the audio into a video demonstrating the ASL translation

## Future Ideas
1. Centralize the project by reducing the amount of languages used, this will contribute a seamless design
2. Utilize a cache of ASL videos to further improve the performance of the Discord Bot
3. Power a web app, that has universal capabilities. Not being tied to Discord chat can serve more people who are hearing impaired/deaf 

