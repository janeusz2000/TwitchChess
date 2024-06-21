import aiohttp
import asyncio
import json


async def sendMove(move: str):
    url = 'http://localhost:8080/submit-move'
    headers = {'Content-Type': 'application/json'}
    move_data = {
        "from": move[:2],
        "to": move[2:]
    }
   
    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers, data=json.dumps(move_data)) as response:
            if response.status == 200:
                print(f"Move {move} submitted successfully")
                response_text = await response.text()
                print(f"Server response: {response_text}")
            else:
                print(f"Failed to submit move {move}")
                response_text = await response.text()
                print(f"Server response: {response_text}")

# Example usage
if __name__ == "__main__":
    move = "e2e4"  # Example move
    asyncio.run(sendMove(move))
