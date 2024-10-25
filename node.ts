import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { Message } from "./message.ts";

export class Node {
    address: string;
    port: number;

    peers: string[] = []; // list of peer URLs

    known_messages: string[] = []; // remember received messages

    constructor(address: string, port: number) {
        this.address = address;
        this.port = port;

        this.runServer();
        console.log(`💎 Listening on ${this.getUrl()}`);
    }

    getUrl() {
        return `http://${this.address}:${this.port}`;
    }

    // Sends a test message to a target URL
    public sayHi(url: string) {
        const message = new Message(`Hi from ${this.getUrl()}!`);
        console.log(`➡️: Sending message "${message.token}" to ${url}`);
        this.known_messages.push(message.token);
        this.send(message, url);
    }

    // Sends a message to a target URL
    async send(message: Message, target_url: string) {
        const req = new Request(target_url + "/node/add_message", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(message),
        });
        const _resp = await fetch(req);
        // console.log("response: ", resp);
    }

    // Broadcasts a message to all known peers
    async broadcast(message: Message) {
        this.known_messages.push(message.token);
        console.log(
            `➡️: Broadcasting ${message.token} to ${this.peers.length} peers.`,
        );
        await Promise.all(this.peers.map(async (peer) => {
            await this.send(message, peer); // Run all `send` calls concurrently
        }));
    }

    public addPeer(url: string, greet?: boolean) {
        this.peers.push(url);
        if (greet) {
            this.greetPeer(url);
        }
    }

    // Ask peer to add us to their list of peers
    async greetPeer(peer: string) {
        const req = new Request(peer + "/node/add_peer", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ address: this.getUrl() }),
        });
        const _resp = await fetch(req);
    }

    async runServer() {
        const router = new Router();
        router
            .get("/", (context) => {
                context.response.body = "Hello world!";
            })
            .get("/node", (context) => {
                context.response.body = `Dzień dobry od node ${this.getUrl()}`;
            })
            .post("/node/add_peer", async (context) => {
                try {
                    const body = context.request.body;
                    if (body.type() === "json") {
                        const req = await body.json();
                        const peer_address = req.address as string;
                        // console.log("Json content", x);
                        if (!this.peers.includes(peer_address)) {
                            console.log(
                                `📳 %cAdding new peer at ${peer_address}.`,
                                "color: orange",
                            );
                            this.addPeer(peer_address);
                        } else {
                            console.log(
                                `📳 Already have peer ${peer_address}.`,
                            );
                        }
                    } else {
                        context.response.status = 400;
                        context.response.body = {
                            message: "Unsupported content type",
                        };
                    }
                } catch (error) {
                    console.error("Error handling request:", error);
                    context.response.status = 500;
                    context.response.body = {
                        message: "Internal Server Error",
                    };
                }
            })
            .post("/node/add_message", async (context) => {
                try {
                    const body = context.request.body;
                    if (body.type() === "json") {
                        const req = await body.json();
                        const mess = req as Message;
                        context.response.status = 200;
                        context.response.body = { message: "response!" };
                        // console.log("Json content", x);
                        if (!this.known_messages.includes(mess.token)) {
                            console.log(`📥 Received new message`, mess);
                            this.broadcast(mess);
                        } else {
                            // Message was already received, don't broadcast
                            console.log(
                                `📥 %cReceived message ${mess.token} again. No rebroadcast.`,
                                "color: gray",
                            );
                        }
                    } else {
                        context.response.status = 400;
                        context.response.body = {
                            message: "Unsupported content type",
                        };
                    }
                } catch (error) {
                    console.error("Error handling request:", error);
                    context.response.status = 500;
                    context.response.body = {
                        message: "Internal Server Error",
                    };
                }
            });

        const app = new Application();
        app.use(router.routes());
        app.use(router.allowedMethods());

        await app.listen({ port: this.port });
    }

    // client(server: Node, message: string) {
    //     const socket = new WebSocket(`ws://${server.address}:${server.port}`);
    //     console.log("Czekam na gotowość serwera...");
    //     socket.addEventListener("open", () => {
    //         console.log(socket.readyState);
    //         socket.send(message);
    //     });
    //     socket.addEventListener("message", (event) => {
    //         console.log(`got response ${event.data}`);
    //     });
    // }
}

if (import.meta.main) {
    const node1 = new Node("localhost", 5811);
    const node2 = new Node("localhost", 5812);

    console.log(node1 == node2);
}
