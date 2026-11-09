import os, requests, json, asyncio, websockets
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()
key = os.getenv('ELEVENLABS_API_KEY')
client = ElevenLabs(api_key=key)

async def test():
    print("Creating test agent...")
    res = client.conversational_ai.agents.create(
        name='Test Nova',
        conversation_config={
            'agent': {
                'first_message': "Hi, I am Nova, your helpful assistant! How can I help you today?",
                'language': 'en',
                'prompt': {
                    'prompt': "Your name is Nova. You are a friendly, helpful voice assistant. Keep your answers short.",
                    'llm': 'gemini-1.5-flash',
                    'temperature': 0.7,
                }
            },
            'tts': {
                'voice_id': 'JBFqnCBsd6RMkjVDRZzb',
            }
        }
    )
    test_agent_id = res.agent_id
    print('Created test agent:', test_agent_id)

    # Get signed URL
    signed = client.conversational_ai.conversations.get_signed_url(agent_id=test_agent_id)
    url = signed.signed_url + '&source=js_sdk&version=1.35.0'
    print('Connecting to WebSocket for test agent...')
    
    try:
        async with websockets.connect(url, subprotocols=['convai']) as ws:
            print('Connected to test agent WebSocket!')
            init_msg = {
                'type': 'conversation_initiation_client_data',
                'source_info': {'source': 'js_sdk', 'version': '1.35.0'},
            }
            await ws.send(json.dumps(init_msg))
            print('Sent initiation message')
            for i in range(10):
                msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                parsed = json.loads(msg)
                msg_type = parsed.get('type')
                print('Msg', i, 'type:', msg_type)
                if msg_type == 'audio':
                    print('SUCCESS! AUDIO RECEIVED FROM NEW TEST AGENT!')
                    break
    except websockets.exceptions.ConnectionClosed as e:
        print('Connection closed! Code:', e.code, 'Reason:', e.reason)
    except Exception as e:
        print('Exception:', type(e), e)
    finally:
        # Check conversation history before deleting
        conv_res = requests.get(f'https://api.elevenlabs.io/v1/convai/conversations?agent_id={test_agent_id}', headers={'xi-api-key': key}).json()
        print('Conv list:', conv_res)
        if conv_res.get('conversations'):
            cid = conv_res['conversations'][0]['conversation_id']
            cdet = requests.get(f'https://api.elevenlabs.io/v1/convai/conversations/{cid}', headers={'xi-api-key': key}).json()
            print('Conversation detail:', json.dumps(cdet, indent=2))
        client.conversational_ai.agents.delete(agent_id=test_agent_id)
        print('Deleted test agent.')

asyncio.run(test())
