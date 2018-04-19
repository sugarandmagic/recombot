# Recombot

Recombot is a Slack bot that facilitates standups.

## User Guide
Users must join #standup, and then in the morning they will be prompted to respond in the bot channel with their answers to the questions. If they don't respond, they will be prompted. At the designated time, all the answers will be collated and posted in #standup if they are from that morning.

## Technical Details

Recombot is build in node.js using the official Slack client (https://www.npmjs.com/package/@slack/client).
The Web API and the Realtime Messaging Service were leveraged, via the Slack client, for obtaining user and channel information and for sending outgoing and listening for incoming messages. 

The application is stateless. The application data persisted using Firebase as a backend. The node library for Firebase (https://www.npmjs.com/package/firebase) is used to talk to the database.

The service is hosted in Docker in a Digital Ocean 'droplet' and deployed with Docker Compose from Git. 
