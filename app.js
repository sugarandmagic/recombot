import { WebClient, RTMClient } from '@slack/client';
import cron from'node-cron';
import firebase from 'firebase';

// Initialize Firebase
const config = {
    apiKey: "AIzaSyDkikJmnksmpS8QWTjqoxBsHmW9_gxfjGs",
    authDomain: "ecombot-dd65e.firebaseapp.com",
    databaseURL: "https://ecombot-dd65e.firebaseio.com",
    projectId: "ecombot-dd65e",
    storageBucket: "ecombot-dd65e.appspot.com",
    messagingSenderId: "480552142043"
};

let standupChannel;

firebase.initializeApp(config);

//
const writeUserData = (responseData) => {
    firebase.database().ref('responses/' + [responseData.user]).set({
        text: responseData.text,
        ts: responseData.ts
    });
};

const token = 'xoxb-346385745456-51bdl8u0hxqhApoLxn4TDrdl'
const morningMessage = 'Good Morning! 🌅\rIt is almost time for our daily standup 😝\rPlease answer the following three questions:\r1. What did you get done yesterday❓\r2. What will you get done today❓\r3. How can the team help you❓';
const web = new WebClient(token);
const rtm = new RTMClient(token);
rtm.start();

// Get the id for the standup channel
const getChannelConversationId = async () => {
    try {
        const channelsList = await web.channels.list();
        return channelsList.channels.find((channel) => channel.name === 'standup').id;
    } catch (error) {
        console.error('Could not obtain channel list', error.message)
    }
};

// Get the list of direct message ids
const getImsList = async () => {
    try {
        const imsAll = await web.im.list();
        const imsList = imsAll.ims;
        const imListNotBots = imsList.filter((im) => im.user !== 'USLACKBOT');
        return imListNotBots.map(function (im) {
            return im.id;
        });
    } catch (error) {
        console.error('Could not obtain channel list', error.message)
    }
};

// Get the id for a specific user's standup bot
const getSpecifcIm = async (user) => {
    try {
        const imsAll = await web.im.list();
        const imsList = imsAll.ims;
        return imsList.filter((im) => im.user === user).pop().id;
    } catch (error) {
        console.error('Could not obtain channel list', error.message)
    }
};

// Post a message to all users in the bot channel
const sendMessageToAll = async (message) => {
    try {
        const conversationIds = await getImsList();
        if (conversationIds) {
            for (let conversationId of conversationIds) {
                const res = await rtm.sendMessage(message, conversationId);
                console.log(`Message sent: ${res.ts}`)
            }
        }
    } catch (error) {
        console.error(`Failed to send message: ${error.message}`);
    }
};

// Send a message to a single user via the bot
const sendMessageToOne = async (message, user) => {
    try {
        const res = await rtm.sendMessage(message, user);
        console.log(`Message sent: ${res}`)
    } catch (error) {
        console.error(`Failed to send message: ${error.message}`);
    }
};

// Listen for incoming from users messages excluding slackbot and excluding those from the bot itself
rtm.on('message', (event) => {
    const { channel, user, text, ts, team } = event
    const responseData = {
        channel,
        user,
        text,
        ts,
        team
    };
    //store responseData in firebase
    if (
        (user !== 'UA6BBMXDE') &&
        channel.startsWith('DA') &&
            (user !== 'USLACKBOT')
        ) {
        writeUserData(responseData);
        console.log(`(channel:${event.channel}) user ${event.user} says: ${event.text}`);
    }
});

// Get a list of all members of the standup channel
const getUserList = async () => {
    try {
        const channelsList = await web.channels.list();
        const channels = channelsList.channels
        const standup = channels.filter((channel) => channel.name === 'standup');
        return standup[0].members;
    } catch (error) {
        console.error('Could not obtain channel list', error.message)
    }
};

// Make an array of all users showing whether they replied or not in the last 30 mins
const checkForTodaysResponse = async () => {
    const halfHour = 1800000;
    const today = Date.now();
    const halfHourAgo = today - halfHour;

    const users = await getUserList();
    const responsesExistPerUser = [];
    const snapshot = await firebase.database().ref('/responses/').once('value');
    const userData = snapshot.val();

    for (let user of users) {
        if (userData[user]) {
            try {
                responsesExistPerUser.push({[user]: !!(userData[user].text && (userData[user].ts) > halfHourAgo )})
            } catch (e) {
                console.error(e.message);

            }
        } else {
            responsesExistPerUser.push({[user]: false})
        }
    }
    return responsesExistPerUser;
};

// Send a message to a specific use to remind them to respond
const nag = async (user) => {
    try {
        const id = await getSpecifcIm(user);
        if (id) {
            const res = await sendMessageToOne('Please remember to post your answers here in time for the standup', id);
            console.log(`Message sent: ${res.ts}`)
        }
    } catch (e) {
        console.error(e.message)
    }
};

// Send messages to all the users who didn't reply yet
const remindUsers = async () => {
    const responses = await checkForTodaysResponse();
    console.log('responses', responses);
    const lates = responses.filter(response =>
        !(Object.values(response)[0])).map(response => Object.keys(response)[0]);
    lates.forEach(user => {
        nag(user)
    })
};

// Post all the responses to the standup channel
const postAllAnswers = async () => {
    standupChannel = await getChannelConversationId();
    const allAnswers = await getAllResponses();
    await sendMessageToOne(allAnswers, standupChannel)
};

// Gather all the responses from the database
const getAllResponses = async () => {
    const snapshot = await firebase.database().ref('/responses/').once('value');
    const responseJson = snapshot.val();
    console.log(responseJson);

    let responseText = 'Time for the standup. Here are everyone\'s responses: \n';

    Object.keys(responseJson).forEach((key) => {
        responseText += `<@${key}> says: ${responseJson[key].text}\n`
    });
    return responseText
};

cron.schedule('55 22 * * *', async () => {
    await sendMessageToAll(morningMessage);
});

cron.schedule('56 22 * * *', async () => {
    await remindUsers()
});

cron.schedule('57 22 * * *', async () => {
    await postAllAnswers();
});