// bot.js

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

console.log("🚀 Initializing Multi-Plant Disease Bot...");

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Helpful debug events
client.on('auth_failure', (msg) => console.error('⛔ AUTH FAILURE:', msg));
client.on('disconnected', (reason) => console.log('🔌 DISCONNECTED:', reason));
client.on('change_state', (state) => console.log('🔁 STATE CHANGE:', state));

client.on('message_create', async (m) => {
    // quick entry log to confirm this listener runs
    console.log('message_create (handler) invoked:', { from: m.from, to: m.to, body: m.body, type: m.type, hasMedia: m.hasMedia });
    try {
        // If client.info is available, skip messages sent by the client itself
        const myId = client.info && client.info.wid ? client.info.wid._serialized : null;
        if (myId && m.from === myId) return; // outgoing message created by bot

        // Otherwise treat it as an incoming message and run the handler
        await handleIncomingMessage(m);
    } catch (err) {
        console.error('message_create handler error:', err);
    }
});

// --- STATE MANAGEMENT ---
// This object will store the current state of each user's conversation.
// Key: user's chat ID (e.g., '8801944565741@c.us')
// Value: { stage: '...', plant: '...' }
const userStates = {};

// --- BOT CONFIGURATION ---
const PLANTS_MENU = {
    '1': { name: 'Corn', key: 'corn' },
    '2': { name: 'Cotton', key: 'cotton' },
    '3': { name: 'Rice', key: 'rice' },
    '4': { name: 'Tea', key: 'tea' },
    '5': { name: 'Tomato', key: 'tomato' },
    '6': { name: 'Mango', key: 'mango' },
    '7': { name: 'Potato', key: 'potato' },
};

const getMenuText = () => {
    let menu = "Welcome! I can predict diseases for the following plants. Please reply with the number of the plant you want to check:\n\n";
    for (const key in PLANTS_MENU) {
        menu += `${key}. ${PLANTS_MENU[key].name}\n`;
    }
    menu += "\nType a number to begin.";
    return menu;
};

// --- WHATSAPP EVENT HANDLERS ---
client.on('qr', (qr) => {
    console.log("📲 Please scan the QR code to link the bot:");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp client is ready!');
    console.log('Send "hi" or "menu" to start a conversation.');
});

// move message handling into a reusable function so we can use it for both 'message' and 'message_create'
async function handleIncomingMessage(msg) {
    try {
        console.log('⤵️  incoming message:', { from: msg.from, body: msg.body, type: msg.type, hasMedia: msg.hasMedia, isGroupMsg: msg.isGroupMsg });

        const user = msg.from;
        const bodyText = msg.body || ''; // guard for media-only messages (msg.body can be undefined)
        const userMessage = bodyText.trim().toLowerCase();
        const currentState = userStates[user];

        // --- 1. Handling Image Input ---
        if (msg.hasMedia && msg.type === 'image') {
            if (currentState && currentState.stage === 'awaiting_image') {
                console.log(`📸 Image received for ${currentState.plant} from ${user}`);
                msg.reply(`Analyzing your *${PLANTS_MENU[currentState.number].name}* image, please wait...`);

                try {
                    const media = await msg.downloadMedia();
                    const imageBase64 = media.data;

                    console.log('🧠 Sending image to Flask API...');
                    const response = await axios.post('http://localhost:5000/predict', {
                        image: imageBase64,
                        plant_type: currentState.plant
                    });

                    const { prediction, confidence } = response.data || {};
                    const confidencePercent = (confidence ? (confidence * 100).toFixed(2) : 'N/A');
                    console.log(`💡 Prediction: ${prediction} (${confidencePercent}%)`);

                    const replyText = `Predicted Disease: ${prediction}\nConfidence: ${confidencePercent}%`;
                    await client.sendMessage(user, replyText);
                    delete userStates[user];

                } catch (error) {
                    console.error('❌ Error processing image:', error.response ? error.response.data : error.message);
                    msg.reply('Sorry, something went wrong while processing your image. Please type "menu" to start over.');
                    delete userStates[user];
                }
            } else {
                msg.reply('I was not expecting an image. Please type "menu" to start the process.');
            }
            return;
        }

        // --- 2. Handling Text Input ---
        if (['hi', 'hello', 'menu', 'start'].includes(userMessage)) {
            userStates[user] = { stage: 'awaiting_plant_choice' };
            await client.sendMessage(user, getMenuText());
            return;
        }

        if (currentState && currentState.stage === 'awaiting_plant_choice') {
            const choice = PLANTS_MENU[userMessage];
            if (choice) {
                userStates[user] = { stage: 'awaiting_image', plant: choice.key, number: userMessage };
                await client.sendMessage(user, `Great! You've selected *${choice.name}*. Please send me a clear image of the plant leaf.`);
            } else {
                await client.sendMessage(user, 'Invalid selection. Please reply with just a number from the menu (e.g., "5" for Tomato).');
            }
            return;
        }

        if (!currentState) {
            userStates[user] = { stage: 'awaiting_plant_choice' };
            await client.sendMessage(user, getMenuText());
        }
    } catch (err) {
        console.error('Handler error:', err);
    }
}

// NOTE: removed the 'message' listener to avoid duplicate processing.
// Use the single 'message_create' listener below as the sole handler.
// client.on('message', handleIncomingMessage);

// Keep single message_create listener (already present further down)
client.initialize();