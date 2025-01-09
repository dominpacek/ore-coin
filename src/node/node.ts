// deno-lint-ignore-file no-explicit-any
import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { Block } from "../blockchain/block.ts";
import { Transaction } from "../blockchain/transaction.ts";
import { Blockchain } from "../blockchain/blockchain.ts";
import { BlockchainMessage } from "./blockchainMessage.ts";
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
    const message = new BlockchainMessage(`Hi from ${this.getUrl()}!`);
    console.log(`➡️: Sending message "${message.token}" to ${url}`);
    this.knownMessages.push(message.token);
    this.send(message, url);
  }

  // Broadcasts a message to all known peers
  async broadcast(
    message: BlockchainMessage,
    endpoint: string = "/node/add_message",
  ) {
    this.knownMessages.push(message.token);
    if (debug_write_messages) {
      console.log(
        `📡 Broadcasting message ${message.token} to ${this.peers.length} peers.`,
      );
    }
    await Promise.all(this.peers.map(async (peer) => {
      await this.send(message, peer, endpoint); // Run all `send` calls concurrently
    }));
  }

  // Sends a message to a target URL, used by broadcast()
  async send(
    message: BlockchainMessage,
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

    console.log(`Asking peers for blockchain.`);
    for (const peer of this.peers) {
      try {
        const req = new Request(peer + "/blockchain", {
          method: "GET",
        });

        const response = await fetch(req);
        const obj = await response.json();
        const receivedBlockchainLength = obj.blocks.length;
        if (receivedBlockchainLength > longestBlockchainLength) {
          const receivedBlockchain = Blockchain.fromJson(JSON.stringify(obj));
          if (!receivedBlockchain.isValid()) {
            continue; // Ignore invalid blockchains
          }
          longestBlockchainLength = receivedBlockchainLength;
          longestBlockchain = receivedBlockchain;
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
    const message = new BlockchainMessage(JSON.stringify(block));
    console.log(`📡: Broadcasting mined block (id=${block.index}).`);
    this.knownMessages.push(message.token);
    this.broadcast(message, "/blockchain/add_block");
  }

  async runHttpServer() {
    const router = new Router();
    router
      .post("/node/add_peer", (context) => {
        this.addPeerHandler(context);
      })
      .get("/blockchain", (context) => {
        context.response.status = 200;
        context.response.body = JSON.stringify(this.blockchain);
        context.response.type = "application/json";
      })
      .post("/blockchain/add_block", (context) => {
        this.handleBlockchainMessage(context, this.addBlockHandler);
      })
      .get("/transactions/balance", (context) => {
        this.handleGetBalance(context);
      })
      .post("/transactions", (context) => {
        this.handleBlockchainMessage(context, this.handleAddTransaction);
      });

    const app = new Application();
    app.use(router.routes());
    app.use(router.allowedMethods());

    await app.listen({ port: this.port });
  }

  async handleBlockchainMessage(
    context: any,
    callbackRequestHandler: (content: string) => void,
  ) {
    // Handles BlockchainMessage requests using the provided callback function
    // Used for requests that need to be rebroadcasted to peers
    try {
      const body = context.request.body;
      if (body.type() !== "json") {
        context.response.status = 400;
        context.response.body = { message: "Unsupported content type" };
        return;
      }
      context.response.status = 200;
      const req = await body.json();
      const mess = req as BlockchainMessage; // Convert json to BlockchainMessage

      if (this.knownMessages.includes(mess.token)) {
        // If message was already received, ignore it and don't broadcast
      } else {
        // If message was not received before, broadcast it to peers and handle it
        if (debug_write_messages) {
          console.log(
            `📥 Received new message for handler ${callbackRequestHandler.name}`,
            mess,
          );
        }
        this.broadcast(mess);
        callbackRequestHandler(mess.content);
      }
    } catch (error) {
      this.logError(callbackRequestHandler.name, error);
      context.response.status = 500;
      context.response.body = { message: "Internal Server Error" };
    }
  }

  async addPeerHandler(context: any) {
    try {
      const body = context.request.body;
      if (body.type() !== "json") {
        context.response.status = 400;
        context.response.body = { message: "Unsupported content type" };
        return;
      }
      const req = await body.json();
      const peerAddress = req.address as string;

      if (!this.peers.includes(peerAddress)) {
        console.log(`📳 %cAdding new peer at ${peerAddress}.`, "color: orange");
        this.addPeer(peerAddress);
      } else {
        console.log(`📳 Already have peer ${peerAddress}.`);
      }
    } catch (error) {
      this.logError("addPeer", error);
      context.response.status = 500;
      context.response.body = { message: "Internal Server Error" };
    }
  }

  addBlockHandler = (json: string) => {
    const receivedBlock = Block.fromJson(JSON.parse(json));
    const latestBlock =
      this.blockchain.blocks[this.blockchain.blocks.length - 1];
    const latestIndex = latestBlock.index;

    if (receivedBlock.index <= latestIndex) {
      // Ignore block if its index isn't higher than the latest block
      return;
    } else if (receivedBlock.index == latestIndex + 1) {
      // Block ready to be added to the chain
      if (
        !receivedBlock.isValid(latestBlock, this.blockchain.difficulty, true)
      ) {
        console.error(`❌ Received invalid block.`);
        return;
      }
      this.addBlock(receivedBlock);
      console.log(
        `🔳 Received new valid block (id=${receivedBlock.index}). Blockchain now ${this.blockchain.blocks.length}bl long.`,
      );
    } else if (latestIndex + 1 < receivedBlock.index) {
      // We are missing blocks, ask peers for full blockchain
      if (receivedBlock.isValidAlone(this.blockchain.difficulty)) {
        console.log(
          `⬛ Received new 'orphan' block, requesting full blockchain.`,
        );
        this.askForBlockchain();
      } else {
        console.error(`❌ Received invalid 'orphan' block.`);
      }
    }
  };

  async handleGetBalance(context: any) {
    try {
      const body = context.request.body;
      if (body.type() !== "json") {
        context.response.status = 400;
        context.response.body = { message: "Unsupported content type" };
        return;
      }

      const req = await body.json();
      const address = req.address as string;
      const balance = this.blockchain.getBalance(address);

      context.response.status = 200;
      context.response.body = { balance: balance };
    } catch (error) {
      this.logError("getBalance", error);
      context.response.status = 500;
      context.response.body = { message: "Internal Server Error" };
    }
  }

  handleAddTransaction = (json: string) => {
    // TODO
    throw new Error("Not implemented yet.");
  };

  private logError(requestName: string, error: unknown) {
    console.error(
      `%cError%c handling %c${requestName}%c request: ${error}`,
      "color:red",
      "color:white",
      "text-decoration: underline",
      "color:white",
    );
  }
}
