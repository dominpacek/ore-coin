// deno-lint-ignore-file no-explicit-any
import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { Block } from "../blockchain/block.ts";
import { Transaction } from "../blockchain/transaction.ts";
import { Blockchain } from "../blockchain/blockchain.ts";
import { GenericMessage } from "./genericMessage.ts";
const debug_write_messages = false;

export class Node {
  address: string;
  port: number;

  peers: string[] = []; // List of peer URLs
  knownMessages: string[] = []; // Remember received messages

  blockchain!: Blockchain;
  localFilesPath: string;

  constructor(address: string, port: number, file_path: string) {
    this.address = address;
    this.port = port;
    this.localFilesPath = file_path;

    this.runHttpServer();
    console.log(`💎 Listening on ${this.getUrl()}`);
  }

  getUrl() {
    return `http://${this.address}:${this.port}`;
  }

  // Mines a block and sends it to peers
  mineBlock(rewardAddress: string) {
    const newBlock = this.blockchain.mineBlock(rewardAddress);
    this.addBlock(newBlock);
    this.broadcastBlock(newBlock);
  }

  addBlock(newBlock: Block) {
    this.blockchain.blocks.push(newBlock);
    this.blockchain.saveBlockChain(this.localFilesPath);
  }

  // Sends a test message to a target URL
  public sayHi(url: string) {
    const message = new GenericMessage(`Hi from ${this.getUrl()}!`);
    console.log(`➡️: Sending message "${message.token}" to ${url}`);
    this.knownMessages.push(message.token);
    this.send(message, url);
  }

  // Broadcasts a message to all known peers
  async broadcast(
    message: GenericMessage,
    endpoint: string = "/node/add_message",
  ) {
    this.knownMessages.push(message.token);
    if (debug_write_messages) {
      console.log(`📡 Broadcasting message ${message.token} to ${this.peers.length} peers.`);
    }
    await Promise.all(this.peers.map(async (peer) => {
      await this.send(message, peer, endpoint); // Run all `send` calls concurrently
    }));
  }

  // Sends a message to a target URL, used by broadcast()
  async send(
    message: GenericMessage,
    target_url: string,
    endpoint: string = "/node/add_message",
  ) {
    const req = new Request(target_url + endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(message),
    });
    const _resp = await fetch(req);
    // console.log("response: ", resp);
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

  async askForBlockchain() {
    // Ask all peers for their blockchains, choose the longest valid one
    let longestBlockchainLength = 0;
    let longestBlockchain: Blockchain | null = null;

    console.log(`Asking peers for blockchain`);
    for (const peer of this.peers) {
      try {
        const req = new Request(peer + "/blockchain", {
          method: "GET",
        });

        const response = await fetch(req);
        const obj = await response.json();
        const receivedBlockchainLength = obj.blocks.length;
        if (receivedBlockchainLength > longestBlockchainLength) {
          longestBlockchainLength = receivedBlockchainLength;
          longestBlockchain = new Blockchain();
          longestBlockchain.blocks = obj.blocks;
        }
      } catch (error) {
        console.error(`Error fetching blockchain from ${peer}:`, error);
      }
    }

    if (longestBlockchain) {
      this.blockchain = longestBlockchain;
      console.log(
        `Fetched blockchain ${this.blockchain.blocks.length}bl long.`,
      );
    } else {
      console.log(
        "No valid blockchain received from peers, starting genesis block.",
      );
      this.blockchain = new Blockchain();
    }
  }

  static async askForBlockchainFromPeer(peer: string) {
    try {
      const req = new Request(peer + "/blockchain", {
        method: "GET",
      });

      const response = await fetch(req);
      const obj = await response.json();

      return Blockchain.fromJson(JSON.stringify(obj));
    } catch (error) {
      console.error(`Error fetching blockchain from ${peer}:`, error);
    }
  }

  public broadcastBlock(block: Block) {
    const message = new GenericMessage(JSON.stringify(block));
    console.log(`📡: Broadcasting mined block index=${block.index}`);
    console.log(`📡: Broadcasting mined block hash=${block.hash}`);
    this.knownMessages.push(message.token);
    this.broadcast(message, "/blockchain/add_block");
  }

  async runHttpServer() {
    const router = new Router();
    router
      .get("/", (context) => {
        context.response.body = "Hello world!";
      })
      .get("/node", (context) => { // todo sprwadzić czy można to wywalić
        context.response.body = `Dzień dobry od node ${this.getUrl()}`;
      })
      .post("/node/add_peer", (context) => {
        this.addPeerHandler(context);
      })
      .get("/blockchain", (context) => {
        context.response.body = JSON.stringify(this.blockchain);
        context.response.type = "application/json";
      })
      .post("/blockchain/add_block", (context) => {
        this.handleGenericMessage(context, this.addBlockHandler);
      })
      .get("/transactions/balance", (context) => {
        this.handleGetBalance(context);
      })
      .post("/transactions", (context) => {
        // this.handleAddTransaction(context);
      });

    const app = new Application();
    app.use(router.routes());
    app.use(router.allowedMethods());

    await app.listen({ port: this.port });
  }

  async handleGenericMessage(context: any, requestHandlerCallback: Function) {
    //TODO callback is async, write its signature
    // Handles a request that contains a json GenericMessage using the provided callback function
    try {
      const body = context.request.body;
      if (body.type() !== "json") {
        context.response.status = 400;
        return;
      }
      
      context.response.status = 200;
      const req = await body.json();
      const mess = req as GenericMessage; // Convert json to GenericMessage

      if (this.knownMessages.includes(mess.token)) {
        // If message was already received, ignore it and don't broadcast
      } else {
        // If message was not received before, broadcast it to peers and handle it
        if (debug_write_messages) {
          console.log(`📥 Received new message for handler ${requestHandlerCallback.name}`, mess);
        }
        this.broadcast(mess);
        requestHandlerCallback(mess);
      }
    } catch (error) {
      console.error(
        `❌❌❌ Error handling request with handler ${requestHandlerCallback.name}: `,
        error,
      );
    }
  }

  async addPeerHandler(context: any) {
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
  }

  addBlockHandler = (message: GenericMessage) => {
    const receivedBlock = Block.fromJson(JSON.parse(message.content));

    const latestBlock =
      this.blockchain.blocks[this.blockchain.blocks.length - 1];
    const latestIndex = latestBlock.index;

    if (receivedBlock.index <= latestIndex) {
      // Ignore block if it's index isn't higher than the latest block
      return;
    } else if (receivedBlock.index == latestIndex + 1) {
      // Block can be added to the chain
      if (!receivedBlock.isValid(latestBlock, this.blockchain.difficulty, true)) {
        console.error(`❌ Received invalid block.`);
        return;
      }
      this.addBlock(receivedBlock);
      console.log(
        `🔳 Received new valid block (id=${receivedBlock.index}). Blockchain now ${this.blockchain.blocks.length}bl long.`,
      );
    } else if (latestIndex + 1 < receivedBlock.index) {
      // We are missing blocks, ask peers for full blockchain
      console.log(`⬛ Received new 'orphan' block, requesting full blockchain.`);
      this.askForBlockchain();
    }
  }

  // TODO
  async handleGetBalance(context: any) {
    await this.handleGenericMessage(context, (mess: GenericMessage) => {
      const address = mess.content;
      const balance = this.blockchain.getBalance(address);
      context.response.body = { balance: balance };
    });
  }
}
