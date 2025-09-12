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
    '1': { name: 'ভুট্টা (Corn)', key: 'corn' },
    '2': { name: 'তুলা (Cotton)', key: 'cotton' },
    '3': { name: 'ধান (Rice)', key: 'rice' },
    '4': { name: 'চা (Tea)', key: 'tea' },
    '5': { name: 'টমেটো (Tomato)', key: 'tomato' },
    '6': { name: 'আলু (Potato)', key: 'potato' },
    // Bengali digits support
    '১': { name: 'ভুট্টা (Corn)', key: 'corn' },
    '২': { name: 'তুলা (Cotton)', key: 'cotton' },
    '৩': { name: 'ধান (Rice)', key: 'rice' },
    '৪': { name: 'চা (Tea)', key: 'tea' },
    '৫': { name: 'টমেটো (Tomato)', key: 'tomato' },
    '৬': { name: 'আলু (Potato)', key: 'potato' },
};

const getMenuText = () => {
    let menu = "স্বাগতম! আমি নিম্নলিখিত গাছের রোগ নির্ণয় করতে পারি। অনুগ্রহ করে যে গাছটি পরীক্ষা করতে চান তার নম্বর লিখুন:\n\n";
    for (const key in PLANTS_MENU) {
        if (key <= '6') { // Only show English digits to avoid duplication
            menu += `${key}. ${PLANTS_MENU[key].name}\n`;
        }
    }
    menu += "\nশুরু করতে একটি নম্বর টাইপ করুন।\n\nটিপ: পাতার ছবি একটি ছবি বা ডকুমেন্ট (jpg/jpeg/png) হিসাবে পাঠান। ডকুমেন্ট হিসাবে পাঠালে মূল গুণমান সংরক্ষিত থাকে।";
    return menu;
};

// --- WHATSAPP EVENT HANDLERS ---
client.on('qr', (qr) => {
    console.log("📲 Please scan the QR code to link the bot:");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp client is ready!');
    console.log('Send "hi", "হাই", "menu", or "মেনু" to start a conversation.');
});

// --- MEDIA HELPERS ---
function isSupportedImageMessage(msg) {
    if (!msg || !msg.hasMedia) return false;
    const type = msg.type || '';
    const raw = (msg._data || {});
    const mimetype = (raw.mimetype || msg.mimetype || '').toLowerCase();
    const filename = (raw.filename || msg.filename || '').toLowerCase();

    const isNativeImage = type === 'image';
    const isDocumentImage = type === 'document' && (
        (mimetype.startsWith('image/')) ||
        /\.(jpe?g|png)$/.test(filename)
    );

    return isNativeImage || isDocumentImage;
}

// move message handling into a reusable function so we can use it for both 'message' and 'message_create'
async function handleIncomingMessage(msg) {
    try {
        console.log('⤵️  incoming message:', { from: msg.from, body: msg.body, type: msg.type, hasMedia: msg.hasMedia, isGroupMsg: msg.isGroupMsg });

        const user = msg.from;
        const bodyText = msg.body || ''; // guard for media-only messages (msg.body can be undefined)
        const userMessage = bodyText.trim().toLowerCase();
        const currentState = userStates[user];

        // --- 1. Handling Image Input (image or image-as-document) ---
        if (msg.hasMedia && isSupportedImageMessage(msg)) {
            if (currentState && currentState.stage === 'awaiting_image') {
                console.log(`📸 Image received (type: ${msg.type}) for ${currentState.plant} from ${user}`);
                msg.reply(`আপনার *${PLANTS_MENU[currentState.number].name}* ছবি বিশ্লেষণ করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...`);

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

                    const replyText = `পূর্বাভাসিত রোগ: ${prediction}`;
                    // const replyText = `Predicted Disease: ${prediction}\nConfidence: ${confidencePercent}%`;
                    await client.sendMessage(user, replyText);
                    delete userStates[user];

                } catch (error) {
                    console.error('❌ Error processing image:', error.response ? error.response.data : error.message);
                    msg.reply('দুঃখিত, আপনার ছবি প্রক্রিয়াকরণে কিছু সমস্যা হয়েছে। আবার শুরু করতে "মেনু" টাইপ করুন।');
                    delete userStates[user];
                }
            } else {
                msg.reply('আমি একটি ছবি আশা করছিলাম না। প্রক্রিয়া শুরু করতে "মেনু" টাইপ করুন।');
            }
            return;
        }

        // --- 2. Handling Text Input ---
        // Support both English and Bengali greetings
        const greetings = ['hi', 'hello', 'menu', 'start', 'হাই', 'হ্যালো', 'মেনু', 'শুরু', 'নমস্কার', 'আদাব'];
        if (greetings.includes(userMessage)) {
            userStates[user] = { stage: 'awaiting_plant_choice' };
            await client.sendMessage(user, getMenuText());
            return;
        }

        if (currentState && currentState.stage === 'awaiting_plant_choice') {
            const choice = PLANTS_MENU[userMessage];
            if (choice) {
                userStates[user] = { stage: 'awaiting_image', plant: choice.key, number: userMessage };
                await client.sendMessage(user, `দুর্দান্ত! আপনি *${choice.name}* নির্বাচন করেছেন। অনুগ্রহ করে গাছের পাতার একটি পরিষ্কার ছবি পাঠান। আপনি এটি একটি সাধারণ ছবি বা ডকুমেন্ট (jpg/jpeg/png) হিসাবে পাঠাতে পারেন গুণমান সংরক্ষণের জন্য।`);
            } else {
                await client.sendMessage(user, 'ভুল নির্বাচন। অনুগ্রহ করে মেনু থেকে শুধুমাত্র একটি নম্বর লিখুন (যেমন, টমেটোর জন্য "৫" বা "5")।');
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