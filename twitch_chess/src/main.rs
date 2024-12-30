use actix_web::middleware::Logger;
use actix_web::{rt, web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_ws::Message;
use chess::{Board, ChessMove, MoveGen};
use colored::*;
use serde::{Deserialize, Serialize};
use std::io::Write;
use tokio::sync::broadcast;
use tokio::time::{self, Duration};

use twitch_irc::{
    login::StaticLoginCredentials, message::ServerMessage, ClientConfig, SecureTCPTransport,
    TwitchIRCClient,
};

use futures_util::StreamExt;

struct AppState {
    sender: broadcast::Sender<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct WebSocketMessage {
    message_type: String,
    message_subtype: String,
    value: String,
}

fn initialize_logger() {
    env_logger::Builder::new()
        .format(|buf, record| {
            let level_color = match record.level() {
                log::Level::Error => Color::Red,
                log::Level::Warn => Color::Yellow,
                log::Level::Info => Color::Green,
                log::Level::Debug => Color::Cyan,
                log::Level::Trace => Color::Magenta,
            };

            std::writeln!(
                buf,
                "{} [{}] {}",
                chrono::Local::now()
                    .format("%Y-%m-%d %H:%M:%S")
                    .to_string()
                    .color(Color::Cyan),
                record.level().to_string().color(level_color),
                record.args()
            )
        })
        .filter(None, log::LevelFilter::Info)
        .init();
}

async fn ws(
    req: HttpRequest,
    stream: web::Payload,
    state: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
    let (res, mut session, mut ws_stream) = actix_ws::handle(&req, stream)?;
    let mut receiver = state.sender.subscribe();

    log::info!(
        "WebSocket connected client={:?}, req={:?} res={:?}",
        receiver,
        req,
        res
    );

    // Spawn a task to listen for broadcast messages and send them to the client
    rt::spawn(async move {
        let mut ping_interval = time::interval(Duration::from_secs(10));
        loop {
            tokio::select! {
                // Listen for broadcast messages
                _ = ping_interval.tick() => {
                                    if session.ping(b"ping").await.is_err() {
                                        log::warn!("Failed to send ping, closing connection");
                                        break;
                                    }
                                },
                Ok(msg) = receiver.recv() => {
                    if session.text(msg).await.is_err() {
                        log::warn!("Failed to send message");
                        break;
                    }
                }
                // Monitor for WebSocket stream termination
                Some(Ok(msg)) = ws_stream.next() => {
                    match msg {
                        Message::Close(msg) => {
                            log::info!("WebSocket session closed msg={:?}", msg);
                            break;
                        }
                        Message::Text(text) => {
                            log::debug!("got message: {}", text.to_string());
                            let serde_result: Result<WebSocketMessage, serde_json::Error> = serde_json::from_str(&text.to_string());
                            match serde_result {
                                Ok(web_socket_message) => {
                                    // this is guaranteed to serialize
                                    let string_message = serde_json::to_string(&web_socket_message).unwrap();
                                    log::info!("Got message={}", &string_message);
                                    let _ = state.sender.send(string_message);
                                },
                                Err(e) => {
                                    log::error!("Invalid signature message={}, error={}, {:?}{:?}{:?}", text.to_string(), e, file!(), ":", line!());
                                }

                            }
                        }
                        Message::Ping(_) => {
                            // service must respond to ping data and send pong back
                        }
                        Message::Pong(_) => {
                            // pong back received will kepp alive the connection

                        }
                        _ => {
                            // Handle other types of messages if needed
                        }
                    }
                }
                else => {
                    log::info!("WebSocket stream ended");
                    break;
                }
            }
        }
    });

    Ok(res)
}

async fn fetch_twitch_chat_messages(sender: broadcast::Sender<String>) {
    let twitch_default_config = ClientConfig::default();
    let (mut incoming_messages, client) =
        TwitchIRCClient::<SecureTCPTransport, StaticLoginCredentials>::new(twitch_default_config);

    let join_handle = tokio::spawn(async move {
        while let Some(message) = incoming_messages.recv().await {
            match message {
                ServerMessage::Privmsg(msg) => {
                    if msg.message_text.starts_with(':') {
                        let message_type = "VOTE".to_string();
                        let message_subtype = "SINGLE".to_string();
                        let value = msg.message_text[1..].to_string();
                        log::info!(
                            "sending message_type={}, message_subtype={}, value={}",
                            &message_type,
                            &message_subtype,
                            &value
                        );

                        let message = WebSocketMessage {
                            message_type,
                            message_subtype,
                            value,
                        };
                        let _ = sender.send(serde_json::to_string(&message).unwrap());
                    }
                }
                _ => {}
            }
        }
    });

    // client.join("caedrel".to_owned()).unwrap();
    client.join("sodapoppin".to_owned()).unwrap();
    join_handle.await.unwrap();
}

async fn ws_chess_game(sender: broadcast::Sender<String>) {
    let mut receiver = sender.subscribe();
    let mut board = Board::default();
    let join_handle = tokio::spawn(async move {
        loop {
            match receiver.recv().await {
                Ok(msg) => {
                    log::debug!("ChessGame got message={}", &msg);
                    let serialization_result: Result<WebSocketMessage, serde_json::Error> =
                        serde_json::from_str(&msg);
                    match serialization_result {
                        Ok(web_socket_message) => {
                            if web_socket_message.message_type == "COMMAND" {
                                match web_socket_message.message_subtype.as_str() {
                                    "GET_AVAILABLE_MOVES" => {
                                        let mut moves_array_string = "".to_string();
                                        let iterable = MoveGen::new_legal(&board);

                                        for chess_move in iterable {
                                            if moves_array_string.is_empty() {
                                                moves_array_string =
                                                    format!("{}", chess_move.to_string());
                                            } else {
                                                moves_array_string = format!(
                                                    "{},{}",
                                                    moves_array_string,
                                                    chess_move.to_string()
                                                );
                                            }
                                        }

                                        let message = WebSocketMessage {
                                            message_type: "RESULT".to_string(),
                                            message_subtype: "GET_AVAILABLE_MOVES".to_string(),
                                            value: format!("[{}]", moves_array_string),
                                        };
                                        let message_string =
                                            serde_json::to_string(&message).unwrap();
                                        log::info!("sending message={}", &message_string);
                                        let _ = sender.send(message_string);
                                    }
                                    "GET_BOARD" => {
                                        let message = WebSocketMessage {
                                            message_type: "RESULT".to_string(),
                                            message_subtype: "GET_BOARD".to_string(),
                                            value: board.to_string(),
                                        };
                                        let message_string =
                                            serde_json::to_string(&message).unwrap();
                                        log::info!("sending message={}", &message_string);
                                        let _ = sender.send(message_string);
                                    }
                                    "MAKE_MOVE" => {
                                        match ChessMove::from_san(&board, &web_socket_message.value)
                                        {
                                            Ok(chess_move) => {
                                                let mut result = Board::default();
                                                board.make_move(chess_move, &mut result);
                                                board = result;
                                                let message = WebSocketMessage {
                                                    message_type: "RESULT".to_string(),
                                                    message_subtype: "MAKE_MOVE".to_string(),
                                                    value: "SUCCESS".to_string(),
                                                };
                                                let message_string =
                                                    serde_json::to_string(&message).unwrap();
                                                log::info!("sending message={}", &message_string);
                                                let _ = sender.send(message_string);
                                            }
                                            Err(e) => {
                                                log::error!(
                                                    "Invalid move={}, error={}",
                                                    &web_socket_message.value,
                                                    e
                                                );
                                            }
                                        }
                                    }
                                    _ => {
                                        log::error!(
                                            "Unrecognised message subtype={}",
                                            &web_socket_message.message_subtype
                                        );
                                    }
                                }
                            }
                        },
                        Err(e) => {
                            log::error!("Invalid signature of the message={}, error={}, {:?}{:?}{:?}", msg, e, file!(), ":", line!());
                        }
                    }
                }
                Err(e) => {
                    log::error!("Error during message receiver={}", e);
                }
            }
        }
    });

    join_handle.await.unwrap();
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    initialize_logger();

    let (sender, _receiver) = broadcast::channel(4);
    let state = web::Data::new(AppState { sender });
    let twitch_chat_client = state.sender.clone();
    let chess_client = state.sender.clone();

    rt::spawn(async move {
        fetch_twitch_chat_messages(twitch_chat_client).await;
    });

    rt::spawn(async move {
        ws_chess_game(chess_client).await;
    });

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .wrap(Logger::new("%a %{User-Agent}i"))
            .route("/ws", web::get().to(ws))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
