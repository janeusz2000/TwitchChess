use actix_web::middleware::Logger;
use actix_web::{rt, web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_ws::Message;
use colored::*;
use std::io::Write;
use tokio::sync::broadcast;
use tokio::time::{self, Duration};

use futures_util::StreamExt;

struct AppState {
    sender: broadcast::Sender<String>,
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
                            let _ = state.sender.send(text.to_string());
                            println!("{}", text);
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

async fn broadcast_timestamps(sender: broadcast::Sender<String>) {
    let mut interval = time::interval(Duration::from_secs(1));
    loop {
        interval.tick().await;
        let timestamp = chrono::Local::now().to_rfc3339();
        let _ = sender.send(timestamp);
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    initialize_logger();

    let (sender, _receiver) = broadcast::channel(100);
    let state = web::Data::new(AppState { sender });
    let sender_clone = state.sender.clone();

    rt::spawn(async move {
        broadcast_timestamps(sender_clone).await;
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
