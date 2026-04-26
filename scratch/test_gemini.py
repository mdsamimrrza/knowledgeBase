
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

# The 4 models to test
MODELS_TO_TEST = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
]

print(f"Testing Gemini connectivity with key: {api_key[:10]}...\n")

for model_name in MODELS_TO_TEST:
    print(f"--- Testing Model: {model_name} ---")
    try:
        model = genai.GenerativeModel(model_name)
        # Use a simple prompt to test response
        response = model.generate_content("Say 'OK' if you are working.")
        print(f"Status: SUCCESS")
        print(f"Response: {response.text.strip()}")
    except Exception as e:
        print(f"Status: FAILED")
        print(f"Error: {e}")
    print("\n")
