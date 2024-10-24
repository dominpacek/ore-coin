import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { Message } from "./message.ts";
import * as emoji from "npm:node-emoji";

export class Node {
    address: string;
    port: number;
    peers: string[] = [];

    received_messages: string[] = [];

    constructor(address: string, port: number) {
        this.address = address;
        this.port = port;

        this.runServer();
        console.log(emoji.emojify(`:gem: Nasłuchuję na ${this.getUrl()}`));
    }

    getUrl() {
        return `http://${this.address}:${this.port}`;
    }

    public addPeer(url: string) {
        this.peers.push(url);
        // TODO endpoint add_peer u celu żeby on też mógł sobie dodać nowego peera 
    }

    public sayHi(url: string) {
        this.send(new Message(`Hi from ${this.getUrl()}!`), url);
    }

    async send(message: Message, target_url: string) {
        console.log(
            emoji.emojify(`➡️: Sending message "${message.token}" to ${target_url}`),
        );

        const req = new Request(target_url + "/node/add_message", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(message),
        });
        const resp = await fetch(req);
        // console.log("response: ", resp);
    }

    async broadcast(message: Message) {
        console.log(`Broadcasting ${message.token} to ${this.peers.length} peers.`);
        await Promise.all(this.peers.map(async (peer) => {
            await this.send(message, peer); // Run all `send` calls concurrently
        }));
    }

    async runServer() {
        const router = new Router();
        router
            .get("/", (context) => {
                context.response.body = "Hello world!";
            })
            .get("/node", (context) => {
                context.response.body = `Dzień dobry od node ${
                    this.getUrl()
                }`;
            })
            .post("/node/add_message", async (context) => {
                try {
                    const body = context.request.body;
                    if (body.type() === "json") {
                        const req = await body.json();
                        const mess = req as Message;
                        // TODO convert req to message
                        context.response.status = 200;
                        context.response.body = { message: "response!" };
                        // console.log("Json content", x);
                        if (!this.received_messages.includes(mess.token)) {
                            console.log(`📥 Received new message`, mess);
                            this.received_messages.push(mess.token);
                            console.log(
                                `Rebroadcasting to ${this.peers.length} peers.`,
                            );
                            this.broadcast(mess);
                        } else {
                            console.log(`📥 Received message ${mess.token} again`);
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
