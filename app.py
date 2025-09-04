# app.py

import tensorflow as tf
from flask import Flask, request, jsonify
import numpy as np
from PIL import Image
import io
import base64

# Initialize the Flask application
app = Flask(__name__)

# --- DATA STRUCTURE FOR ALL MODELS ---
# A dictionary to hold the loaded models and their class names
PLANT_MODELS = {
    'corn': {
        'model_path': 'corn_densenet_finetuned_model.h5',
        'classes': ['Common Rust', 'Gray Leaf Spot', 'Blight', 'Healthy'],
        'model_obj': None # This will hold the loaded model object
    },
    'cotton': {
        'model_path': 'cotton_densenet_finetuned_model.h5',
        'classes': ['bacterial_blight', 'curl_virus', 'fussarium_wilt', 'healthy'],
        'model_obj': None
    },
    'rice': {
        'model_path': 'rice_densenet_finetuned_model.h5',
        'classes': ['bacterial Leaf Blight', 'brown Spot', 'healthy', 'leaf Blast', 'leaf Scald', 'narrow Brown Spot'],
        'model_obj': None
    },
    'tea': {
        'model_path': 'tea_densenet_finetuned_model.h5',
        'classes': ['algal_spot', 'brown_blight', 'gray_blight', 'healthy', 'helopeltis', 'red_spot'],
        'model_obj': None
    },
    'tomato': {
        'model_path': 'tomato_densenet_finetuned_model.h5',
        'classes': ['Tomato_mosaic_virus', 'Target_Spot', 'Bacterial_spot', 'Tomato_Yellow_Leaf_Curl_Virus', 'Late_blight', 'Leaf_Mold', 'Early_blight', 'Spider_mites Two-spotted_spider_mite', 'Tomato___healthy', 'Septoria_leaf_spot'],
        'model_obj': None
    },
    'mango': {
        'model_path': 'mango_densenet_finetuned_model.h5',
        'classes': ['Anthracnose', 'Bacterial Canker', 'Cutting Weevil', 'Die Back', 'Gall Midge', 'Powdery Mildew', 'Sooty Mould'],
        'model_obj': None
    },
    'potato': {
        'model_path': 'potato_densenet_finetuned_model.h5',
        'classes': ['Potato___Early_blight', 'Potato___Late_blight', 'Potato___healthy'],
        'model_obj': None
    }
}

# --- MODEL LOADING ---
# Load all models at startup
# NOTE: This will use a significant amount of RAM.
print("Loading all models, this may take a moment...")
try:
    # Define custom objects for augmentation layers (as we fixed before)
    custom_objects = {
        "RandomHeight": tf.keras.layers.RandomHeight, "RandomWidth": tf.keras.layers.RandomWidth,
        "RandomFlip": tf.keras.layers.RandomFlip, "RandomRotation": tf.keras.layers.RandomRotation,
        "RandomZoom": tf.keras.layers.RandomZoom, "Rescaling": tf.keras.layers.Rescaling
    }
    
    for plant, details in PLANT_MODELS.items():
        print(f"-> Loading model for: {plant}")
        details['model_obj'] = tf.keras.models.load_model(details['model_path'], custom_objects=custom_objects)
    
    print("\n✅ All models loaded successfully!")

except Exception as e:
    print(f"\n❌ FATAL ERROR during model loading: {e}")
    # We will not proceed if models fail to load
    exit()

# --- IMAGE PREPROCESSING ---
# CORRECTED VERSION: We let the model handle the rescaling.
def preprocess_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    # IMPORTANT: Change (224, 224) if your models use a different size!
    img = img.resize((224, 224))
    
    # Convert image to numpy array. The values will be in the [0, 255] range.
    img_array = tf.keras.preprocessing.image.img_to_array(img)
    
    # DO NOT DIVIDE BY 255.0 HERE. The model has a Rescaling layer that does this.
    
    # Expand dimensions to create a batch of 1
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array

# --- API ENDPOINT ---
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    if 'image' not in data or 'plant_type' not in data:
        return jsonify({'error': 'Missing image or plant_type in request'}), 400

    plant_type = data['plant_type']
    if plant_type not in PLANT_MODELS:
        return jsonify({'error': f'Invalid plant_type: {plant_type}'}), 400

    # Get the correct model and class list for the requested plant
    model_info = PLANT_MODELS[plant_type]
    model = model_info['model_obj']
    class_names = model_info['classes']

    if model is None:
        return jsonify({'error': f'Model for {plant_type} is not loaded'}), 500

    try:
        image_bytes = base64.b64decode(data['image'])
        processed_image = preprocess_image(image_bytes)
        
        prediction = model.predict(processed_image)
        
        predicted_index = np.argmax(prediction[0])
        predicted_class = class_names[predicted_index]
        confidence = float(np.max(prediction[0]))

        print(f"Prediction for {plant_type}: {predicted_class} with confidence {confidence:.2f}")
        
        return jsonify({
            'prediction': predicted_class,
            'confidence': confidence
        })

    except Exception as e:
        print(f"❌ Error during prediction for {plant_type}: {e}")
        return jsonify({'error': 'Failed to process image'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)