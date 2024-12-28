import argparse
import asyncio
import websockets
from typing import Final

URI: Final = "ws://127.0.0.1:8080/ws"  # WebSocket server URL

async def websocket_send(message: str, close_event):
    try:
        async with websockets.connect(URI, ping_interval=None) as websocket:
            print(f"WebSocket server=\"{URI}\" CONNECTED")
            print(f"Message=\"{message}\" sent!")

            while not close_event.is_set():
                try:
                    await asyncio.wait_for(websocket.send(message), timeout=1.0)
                    break

                except asyncio.TimeoutError:
                    print("Did not succeed in sending the message, trying again in 1s")
                    await asyncio.sleep(1)

    except websockets.ConnectionClosed as e:
        print(f"Connection closed: {e}")
    finally:
        if not close_event.is_set():
            close_event.set()
        print(f"WebSocket server=\"{URI}\" DISCONNECTED")

async def websocket_receive(close_event):
    try:
        async with websockets.connect(URI, ping_interval=None) as websocket:
            print(f"WebSocket server=\"{URI}\" CONNECTED")

            async def send_pong():
                while not close_event.is_set():
                    try:
                        pong_waiter = await websocket.ping()
                        await pong_waiter  # Wait for the pong response
                        print("Pong sent in response to ping")
                    except asyncio.CancelledError:
                        break
                    except Exception as e:
                        print(f"Error responding to ping: {e}")

            pong_task = asyncio.create_task(send_pong())

            try:
                while not close_event.is_set():
                    try:
                        response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                        print(response)
                    except asyncio.TimeoutError:
                        # Continue checking if we need to close the connection
                        pass
            finally:
                pong_task.cancel()
                await pong_task

    except websockets.ConnectionClosed as e:
        print(f"Connection closed: {e}")
    finally:
        print(f"WebSocket server=\"{URI}\" DISCONNECTED")

async def stop_websocket(close_event):
    try:
        while not close_event.is_set():
            await asyncio.sleep(1)  # Keep the loop running
    except KeyboardInterrupt:
        print("KeyboardInterrupt detected, stopping...")
        close_event.set()

async def main():
    description = """
    Script that sends or receives websocket messages for testing purposes.
    """
    parser = argparse.ArgumentParser(description)
    group = parser.add_mutually_exclusive_group(required=True)

    group.add_argument("-s", "--send", type=str, help="Send message to the websocket", required=False)
    group.add_argument("-l", "--listen", action="store_true", help="Listen to the websocket events", required=False)

    args = parser.parse_args()

    if args.send:
        close_event = asyncio.Event()
        sending_tasks = asyncio.create_task(websocket_send(args.send, close_event))
        stop_task = asyncio.create_task(stop_websocket(close_event))
        await asyncio.gather(sending_tasks, stop_task)

    if args.listen:
        close_event = asyncio.Event()
        listen_task = asyncio.create_task(websocket_receive(close_event))
        stop_task = asyncio.create_task(stop_websocket(close_event))

        # Wait for both tasks to complete
        await asyncio.gather(listen_task, stop_task)

if __name__ == "__main__":
    asyncio.run(main())
