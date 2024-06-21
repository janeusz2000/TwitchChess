package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/rs/cors"
)

type Move struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type Phase struct {
	CurrentPhase string `json:"currentPhase"`
	Timer        int    `json:"timer,omitempty"`
}

var (
	moves       []Move
	votingPhase bool
	mu          sync.Mutex
	clients     = make(map[*websocket.Conn]bool)
	broadcast   = make(chan Phase)
	upgrader    = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
)

func startVotingHandler(w http.ResponseWriter, r *http.Request) {
	duration := 15

	mu.Lock()
	defer mu.Unlock()

	if votingPhase {
		http.Error(w, "Voting phase already started", http.StatusBadRequest)
		return
	}

	votingPhase = true
	moves = []Move{}

	phase := Phase{CurrentPhase: "voting", Timer: duration}
	broadcast <- phase

	go startVotingTimer(duration)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Voting phase started"))
}

func startVotingTimer(duration int) {
	for i := duration; i > 0; i-- {
		time.Sleep(1 * time.Second)
		mu.Lock()
		if !votingPhase {
			mu.Unlock()
			return
		}
		phase := Phase{CurrentPhase: "voting", Timer: i - 1}
		broadcast <- phase
		mu.Unlock()
	}
	endVotingPhase()
}

func wsClientMoveHandler(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()


	var move Move
	err := json.NewDecoder(r.Body).Decode(&move)
	if err != nil {
		http.Error(w, "Invalid move", http.StatusBadRequest)
		return
	}

  applyMoveToChessboard(move);

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Move submitted"))
}

func submitMoveHandler(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()
	if !votingPhase {
		http.Error(w, "Voting phase not started", http.StatusBadRequest)
		return
	}

	var move Move
	err := json.NewDecoder(r.Body).Decode(&move)
	if err != nil {
		http.Error(w, "Invalid move", http.StatusBadRequest)
		return
	}

	moves = append(moves, move)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Move submitted"))
}

func endVotingHandler(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()

	if !votingPhase {
		http.Error(w, "Voting phase not started", http.StatusBadRequest)
		return
	}

	endVotingPhase()

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Voting phase ended"))
}

func endVotingPhase() {
	votingPhase = false

	if len(moves) == 0 {
		broadcast <- Phase{CurrentPhase: "idle"}
		return
	}

	// Calculate the most frequent move
	moveCount := make(map[Move]int)
	for _, move := range moves {
		moveCount[move]++
	}

	var mostFrequentMove Move
	maxCount := 0
	for move, count := range moveCount {
		if count > maxCount {
			mostFrequentMove = move
			maxCount = count
		}
	}

	broadcast <- Phase{CurrentPhase: "idle"}
	broadcastMove(mostFrequentMove)
}

func broadcastMove(move Move) {
	for client := range clients {
		err := client.WriteJSON(move)
		if err != nil {
			log.Printf("WebSocket error: %v", err)
			client.Close()
			delete(clients, client)
		}
	}
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer ws.Close()

	mu.Lock()
	clients[ws] = true
	log.Printf("Client connected. Total clients: %d\n", len(clients))
	mu.Unlock()

	for {
		var msg Phase
		err := ws.ReadJSON(&msg)
		if err != nil {
			mu.Lock()
			delete(clients, ws)
			log.Printf("Client disconnected. Total clients: %d\n", len(clients))
			mu.Unlock()
			break
		}
	}
}

func handleMessages() {
	for {
		phase := <-broadcast
		for client := range clients {
			err := client.WriteJSON(phase)
			if err != nil {
				log.Printf("WebSocket error: %v", err)
				client.Close()
				mu.Lock()
				delete(clients, client)
				log.Printf("Client disconnected due to error. Total clients: %d\n", len(clients))
				mu.Unlock()
			}
		}
	}
}

func connectedClientsHandler(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()

	numClients := len(clients)
	response := map[string]int{"connected_clients": numClients}
	jsonResponse, err := json.Marshal(response)
	if err != nil {
		http.Error(w, "Error generating response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonResponse)
}

func applyMoveToChessboard(move Move) {
  log.Printf("move applied: %s", move)
	// TODO: implement a chessboard here
}

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/start-voting", startVotingHandler).Methods("POST")
	r.HandleFunc("/submit-move", submitMoveHandler).Methods("POST")
	r.HandleFunc("/end-voting", endVotingHandler).Methods("POST")
	r.HandleFunc("/ws", handleConnections)
  r.HandleFunc("/ws-client-move", wsClientMoveHandler).Methods("POST")
	r.HandleFunc("/connected-clients", connectedClientsHandler).Methods("GET")

	// Use CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	votingPhase = false

	go handleMessages()

	log.Println("Starting server on :8080...")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
