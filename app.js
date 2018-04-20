import { WebClient, RTMClient } from '@slack/client';
import cron from'node-cron';
import firebase from 'firebase';

// Initialize Firebase
//TODO: take the Firebase API key out and making it an env var
const config = {
    apiKey: "AIzaSyDkikJmnksmpS8QWTjqoxBsHmW9_gxfjGs",
    authDomain: "ecombot-dd65e.firebaseapp.com",
    databaseURL: "https://ecombot-dd65e.firebaseio.com",
    projectId: "ecombot-dd65e",
    storageBucket: "ecombot-dd65e.appspot.com",
    messagingSenderId: "480552142043"
};
firebase.initializeApp(config);

let standupChannel;

// write data to Firebase
const writeUserData = (responseData) => {
    firebase.database().ref('responses/' + [responseData.user]).set({
        text: responseData.text,
        ts: responseData.ts
    });
};

const morningMessage = 'Good Morning! 🌅\rIt is almost time for our daily standup 😝\rPlease answer the following three questions:\r1. What did you get done yesterday❓\r2. What will you get done today❓\r3. How can the team help you❓';
const web = new WebClient(process.env.TOKEN);
const rtm = new RTMClient(process.env.TOKEN);
rtm.start();

// Get the id for the standup channel
//TODO: use a proper logger
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
    //TODO: Don't hardcode this specific bot's ID
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

// cron.schedule('30 9 * * *', async () => {
//     await sendMessageToAll(morningMessage);
// });
//
// cron.schedule('50 9 * * *', async () => {
//     await remindUsers()
// });
//
// cron.schedule('0 10 * * *', async () => {
//     await postAllAnswers();
// });

cron.schedule('40 21 * * *', async () => {
    await sendMessageToAll(morningMessage);
});

cron.schedule('41 21 * * *', async () => {
    await remindUsers()
});

cron.schedule('42 21 * * *', async () => {
    await postAllAnswers();
});