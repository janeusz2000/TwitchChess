import aiohttp
import asyncio
import json
from typing import Final

MAIN_URL: Final = "http://localhost:8080"


def create_url(api: str):
    url = f"{MAIN_URL}/{api}"
    print(f"creating url: {url}")
    return url


async def start_voting_phase():
    url = create_url('start-voting')

    async with aiohttp.ClientSession() as session:
        async with session.post(url) as response:
            if response.status == 200:
                print("Voting phase started successfully")
                response_text = await response.text()
                print(f"Server response: {response_text}")
            else:
                print("Failed to start voting phase")
                response_text = await response.text()
                print(f"Server response: {response_text}")


async def send_move(move: str):
    url = create_url('submit-move')
    headers = {"Content-Type": "application/json"}
    move_data = {"from": move[:2], "to": move[2:]}

    async with aiohttp.ClientSession() as session:
        async with session.post(
            url, headers=headers, data=json.dumps(move_data)
        ) as response:
            if response.status == 200:
                print(f"Move {move} submitted successfully")
                response_text = await response.text()
                print(f"Server response: {response_text}")
            else:
                print(f"Failed to submit move {move}")
                response_text = await response.text()
                print(f"Server response: {response_text}")


if __name__ == "__main__":
    asyncio.run(start_voting_phase())
    asyncio.run(send_move('d2d4'))
