# WhatsApp Plant Disease Detection Bot

A WhatsApp bot that uses AI models to detect diseases in various plants including Corn, Cotton, Rice, Tea, Tomato and Potato.

## Features

- **Multi-Plant Support**: Detects diseases in 6 different plant types
- **WhatsApp Integration**: Easy-to-use bot interface via WhatsApp
- **AI-Powered**: Uses fine-tuned DenseNet models for accurate disease detection
- **Real-time Analysis**: Instant disease prediction with confidence scores

## Supported Plants & Diseases

| Plant | Diseases Detected |
|-------|------------------|
| **Corn** | Common Rust, Gray Leaf Spot, Blight, Healthy |
| **Cotton** | Bacterial Blight, Curl Virus, Fussarium Wilt, Healthy |
| **Rice** | Bacterial Leaf Blight, Brown Spot, Healthy, Leaf Blast, Leaf Scald, Narrow Brown Spot |
| **Tea** | Algal Spot, Brown Blight, Gray Blight, Healthy, Helopeltis, Red Spot |
| **Tomato** | Mosaic Virus, Target Spot, Bacterial Spot, Yellow Leaf Curl Virus, Late Blight, Leaf Mold, Early Blight, Spider Mites, Healthy, Septoria Leaf Spot |
| **Potato** | Early Blight, Late Blight, Healthy |

## Prerequisites

- **Python 3.7+**
- **Node.js 14+**
- **WhatsApp account** (for bot authentication)

## Installation & Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/Likhan007/Defense-WhatsApp-Disease-Detection-Bot.git
cd Defense-WhatsApp-Disease-Detection-Bot
```

### Step 2: Set Up Python Environment (Not mandatory if you don't mind installing package in you desktop environment)
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### Step 3: Set Up Node.js Environment
```bash
# Install Node.js dependencies
npm install
```

## Running the Application

### Step 1: Start the Flask API Server
```bash
# Make sure your virtual environment is activated
python app.py
```

The Flask server will start on `http://localhost:5000` and load all the AI models (this may take a few moments).

### Step 2: Start the WhatsApp Bot
```bash
# In a new terminal window
node bot.js
```

### Step 3: Connect WhatsApp
1. A QR code will appear in the terminal
2. Open WhatsApp on your phone
3. Go to **Settings** → **Linked Devices** → **Link a Device**
4. Scan the QR code displayed in the terminal
5. The bot will be ready when you see "✅ WhatsApp client is ready!"

## How to Use

1. **Start the bot**: Send "hi", "hello", "menu", or "start" to the bot
2. **Choose a plant**: Select a number from the menu (1-7)
3. **Send an image**: Take a clear photo of the plant leaf and send it
4. **Get results**: The bot will analyze the image and return the predicted disease
<img width="453" height="1280" alt="image" src="https://github.com/user-attachments/assets/9b468716-ed6f-40b6-8400-a37455980f02" />

## Project Structure

```
whatsapp-cotton-bot/
├── app.py                          # Flask API server
├── bot.js                          # WhatsApp bot client
├── requirements.txt                # Python dependencies
├── package.json                    # Node.js dependencies
├── README.md                       # This file
├── *.h5                           # AI model files (6 plant models)
└── SOME TEST IMAGES/              # Sample test images
```

## API Endpoints

- **POST** `/predict`
  - **Body**: `{"image": "base64_encoded_image", "plant_type": "plant_name"}`
  - **Response**: `{"prediction": "disease_name", "confidence": 0.95}`

## Troubleshooting

### Common Issues

1. **Models not loading**: Ensure all `.h5` model files are in the project directory
2. **QR code not working**: Make sure you're using the latest version of WhatsApp
3. **Port already in use**: Change the port in `app.py` if port 5000 is occupied
4. **Memory issues**: The models require significant RAM (recommended: 8GB+)

### Error Messages

- **"Model not loaded"**: Restart the Flask server
- **"Invalid plant_type"**: Use one of: corn, cotton, rice, tea, tomato, potato
- **"Failed to process image"**: Ensure the image is clear and in a supported format

## Dependencies

### Python Dependencies
- Flask
- TensorFlow
- NumPy
- Pillow

### Node.js Dependencies
- whatsapp-web.js
- axios
- qrcode-terminal

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions, please check the troubleshooting section above or create an issue in the repository. 
