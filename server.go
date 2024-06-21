package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type Move struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type Phase struct {
	CurrentPhase string `json:"currentPhase"`
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

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/start-voting", startVotingHandler).Methods("POST")
	r.HandleFunc("/submit-move", submitMoveHandler).Methods("POST")
	r.HandleFunc("/end-voting", endVotingHandler).Methods("POST")
	r.HandleFunc("/ws", handleConnections)
	r.HandleFunc("/connected-clients", connectedClientsHandler).Methods("GET")

	votingPhase = false

	go handleMessages()

	log.Println("Starting server on :8080...")
	log.Fatal(http.ListenAndServe(":8080", r))
}

func startVotingHandler(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()

	if votingPhase {
		http.Error(w, "Voting phase already started", http.StatusBadRequest)
		return
	}

	votingPhase = true
	moves = []Move{}

	phase := Phase{CurrentPhase: "voting"}
	broadcast <- phase

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Voting phase started"))
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

	votingPhase = false

	if len(moves) == 0 {
		http.Error(w, "No moves to process", http.StatusBadRequest)
		return
	}

  // TODO: Select the most frequent move here:
	selectedMove := moves[0]
  log.Printf("Temporary move selected: %s", selectedMove);

	phase := Phase{CurrentPhase: "idle"}
	broadcast <- phase

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Voting phase ended. Move selected: " + selectedMove.From + " to " + selectedMove.To))
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
	// You need to implement this function to apply the move to your chessboard
	// This could involve updating your chessboard data structure and notifying any clients
}
