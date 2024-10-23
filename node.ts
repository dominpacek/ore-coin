class Node {
    address: string;
    port: number;
    peers: Node[] = [];

    constructor(address : string, port : number) {
        this.address = address;
        this.port = port;

        // TODO add blockchain
        this.runServer();
    }

    addPeer(peer: Node) {
        this.peers.push(peer);
    }

    send(message: string, target: Node) {
        console.log(`Sending message "${message}" to ${target.address}:${target.port}`);

    }

    broadcast(message: string) {
        this.peers.forEach(peer => {
            this.send(message, peer);
        });
    }


    runServer() {
        Deno.serve({ port: this.port }, (req) => {
            if (req.headers.get("upgrade") != "websocket") {
                return new Response(null, { status: 501 });
            }
    
            const { socket, response } = Deno.upgradeWebSocket(req);
    
            socket.addEventListener("open", () => {
                console.log("a client connected!");
            });
    
            socket.addEventListener("message", (event) => {
                console.log("received message:", event.data);
                if (event.data === "ping") {
                    socket.send("pong");
                }
            });
    
            return response;
        });
    }

    client(server: Node, message: string) {
        const socket = new WebSocket(`ws://${server.address}:${server.port}`);
        console.log("Czekam na gotowość serwera...");
        socket.addEventListener("open", () => {
            console.log(socket.readyState);
            socket.send(message);
        });
        socket.addEventListener("message", (event) => {
            console.log(`got response ${event.data}`);
        });
    }
}