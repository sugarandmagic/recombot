# Recombot

Recombot is a Slack bot that facilitates standups.

## User Guide
Users join #standup, and then in the morning they will be prompted to respond in the bot channel with their answers to the questions. If they don't respond, they will be reminded. At the designated time, all the answers from this 30 minute period will be collated and posted in #standup.

## Technical Details

Recombot is built with node.js in ES6 using the official Slack client (https://www.npmjs.com/package/@slack/client).
Babel is used to compile the JavaScript.

The Web API and the Realtime Messaging Service were leveraged, via the Slack client, for obtaining user and channel information and for sending outgoing messages to users and listening for replies in the users' @recombot channel. 

The application is stateless. The application data is persisted using Firebase Realtime Database as a backend. The node library for Firebase (https://www.npmjs.com/package/firebase) is used to talk to the database.

The service is hosted in Docker in a Digital Ocean 'droplet' and deployed with Docker Compose from Git. 
