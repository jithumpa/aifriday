"""Test TCS GenAI Lab API connection"""
import httpx
from openai import OpenAI
from config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL

print(f"Testing connection to: {OPENAI_BASE_URL}")
print(f"Using model: {OPENAI_MODEL}")
print(f"API Key: {OPENAI_API_KEY[:15]}...")
print()

# First test basic HTTP connectivity
print("Step 1: Testing basic HTTP connectivity...")
try:
    # Try with SSL verification disabled for corporate environments
    with httpx.Client(verify=False, timeout=30.0) as http_client:
        response = http_client.get(f"{OPENAI_BASE_URL}/models")
        print(f"  HTTP Status: {response.status_code}")
        if response.status_code == 200:
            print("  ✅ HTTP connection successful")
        else:
            print(f"  Response: {response.text[:200]}")
except Exception as e:
    print(f"  ❌ HTTP Error: {e}")

print()
print("Step 2: Testing OpenAI client...")
try:
    # Create client with custom httpx client (SSL verification disabled)
    http_client = httpx.Client(verify=False, timeout=60.0)
    client = OpenAI(
        api_key=OPENAI_API_KEY, 
        base_url=OPENAI_BASE_URL,
        http_client=http_client
    )
    
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": "Say hello in one word"}],
        max_tokens=10
    )
    
    print("✅ SUCCESS!")
    print(f"Response: {response.choices[0].message.content}")
except Exception as e:
    print(f"❌ ERROR: {type(e).__name__}: {e}")
