// deno-lint-ignore-file no-explicit-any
import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { Block } from "../blockchain/block.ts";
import { Transaction } from "../blockchain/transaction.ts";
import { Blockchain } from "../blockchain/blockchain.ts";
import { BlockchainMessage } from "./blockchainMessage.ts";
const debug_write_messages = true;

export class Node {
  address: string;
  port: number;
  rewardAddress: string;
  blockchainPath: string;

  peers: string[] = []; // List of peer URLs
  knownMessages: string[] = []; // Remember received messages

  blockchain!: Blockchain;

  isMiner: boolean = false; // Node will never mine if false - used for testing
  currentlyMining: boolean = false;
  currentlyMinedBlock: Block | null = null;

  constructor(address: string, port: number, blockchainPath: string, rewardAddress: string) {
    this.address = address;
    this.port = port;
    this.blockchainPath = blockchainPath;
    this.rewardAddress = rewardAddress;

    this.runHttpServer();
    console.log(`💎 Listening on ${this.getUrl()}`);
  }

  getUrl() {
    return `http://${this.address}:${this.port}`;
  }

  setMiner(isMiner: boolean) {
    this.isMiner = isMiner;
  }

  startMining() {
    if (!this.isMiner) return;
    this.currentlyMining = true;
    this.mineBlock();
  }

  stopMining() {
    if (!this.isMiner) return;
    this.currentlyMining = false;
    if (this.currentlyMinedBlock) {
      this.currentlyMinedBlock.abortMining();
    }
  }

  async mineBlock() {
    while (this.currentlyMining) {
      try {
        console.log(`%cStart mining...`, "color: #c6b0e8");
        this.currentlyMinedBlock = this.blockchain.createNextBlock(this.rewardAddress);
        const success = await this.currentlyMinedBlock.mine();
        if (!success) {
          console.log("%cMining aborted.", "color: #c6b0e8");
          return;
        }
        console.log(
          `%cMining finished! Nonce: ${this.currentlyMinedBlock.nonce} Hash: ${this.currentlyMinedBlock.hash}`,
          "color: #c6b0e8",
        );
        this.addBlock(this.currentlyMinedBlock);
        // this.broadcastBlock(this.currentlyMinedBlock);
      } catch (error) {
        console.error("Error during mining:", error);
      }
    }
    console.log("Mining stopped.");
  }

  addBlock(newBlock: Block) {
    this.blockchain.addBlock(newBlock);
    this.blockchain.saveBlockchain(this.blockchainPath);

    // TODO unspent/pending transaction updating
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
        `📡 %cBroadcasting message ${message.token} to ${this.peers.length} peers.`,
        "color: orange",
      );
    }
    await Promise.all(this.peers.map(async (peer) => {
      try {
        await this.send(message, peer, endpoint); // Run all `send` calls concurrently
      } catch (_error) {
        // Ignore connection errors
      }
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
        if (receivedBlockchainLength > longestBlockchainLength) { // Choose the longest blockchain (tiebreaker: received first)
          const receivedBlockchain = Blockchain.fromJson(JSON.stringify(obj));
          if (!receivedBlockchain.isValid(true)) {
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
      if (!this.blockchain) {
        this.blockchain = longestBlockchain;
      }
      else {
        this.blockchain.replaceBlockchain(longestBlockchain);
      }
      console.log(
        `%cFetched blockchain ${this.blockchain.blocks.length}bl long.`,
        "color: green",
      );
    } else {
      console.log("No valid blockchain received from peers.");
      if (!this.blockchain) {
        this.blockchain = new Blockchain();
        console.log("Starting genesis block.")
      }
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

  static async postTransactionToPeer(peer: string, transaction: Transaction) {
    const message = new BlockchainMessage(transaction.toJson());
    const req = new Request(peer + "/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(message),
    });
    const _resp = await fetch(req);
  }

  public broadcastBlock(block: Block) {
    const message = new BlockchainMessage(JSON.stringify(block));
    console.log(
      `📡: %cBroadcasting mined block (id=${block.index}).`,
      "color: orange",
    );
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
        this.handleBlockchainMessage(context, this.addBlockHandler, '/blockchain/add_block');
      })
      .get("/transactions/balance", (context) => {
        this.handleGetBalance(context);
      })
      .post("/transactions", (context) => {
        this.handleBlockchainMessage(context, this.handleAddTransaction, '/transactions');
      });

    const app = new Application();
    app.use(router.routes());
    app.use(router.allowedMethods());

    await app.listen({ port: this.port });
  }

  async handleBlockchainMessage(
    context: any,
    callbackRequestHandler: (content: string) => void,
    endpoint: string
  ) {
    console.log()
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
        this.knownMessages.push(mess.token);
        // If message was not received before, broadcast it to peers and handle it
        if (debug_write_messages) {
          console.log(
            `📥 Received new message for handler ${callbackRequestHandler.name}`,
            mess,
          );
        }
        this.broadcast(mess, endpoint);
        callbackRequestHandler(mess.content);
      }
    } catch (error) {
      this.logHandlerError(callbackRequestHandler.name, error);
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
        console.log(`📳 %cAdding new peer at ${peerAddress}.`, "color: green");
        this.addPeer(peerAddress);
      } else {
        console.log(`📳 %cAlready have peer ${peerAddress}.`, "color: green");
      }
    } catch (error) {
      this.logHandlerError("addPeer", error);
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
        !this.blockchain.isNewBlockValid(receivedBlock, true)
      ) {
        console.error(`❌ %cReceived invalid block.`, "color: green");
        return;
      }
      this.stopMining();
      this.addBlock(receivedBlock);
      console.log(
        `🔳 %cReceived new valid block (id=${receivedBlock.index}). Blockchain now ${this.blockchain.blocks.length}bl long.`,
        "color: green",
      );
      this.startMining();
    } else if (latestIndex + 1 < receivedBlock.index) {
      // We are missing blocks, ask peers for full blockchain
      if (receivedBlock.isValid()) {
        console.log(
          `⬛ %cReceived new 'orphan' block, requesting full blockchain.`,
          "color: green",
        );
        this.askForBlockchain();
      } else {
        console.error(`❌ %cReceived invalid 'orphan' block.`, "color: green");
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
      this.logHandlerError("getBalance", error);
      context.response.status = 500;
      context.response.body = { message: "Internal Server Error" };
    }
  }

  handleAddTransaction = (json: string) => {
    console.log(`📥 Received new transaction.`);
    const transaction = Transaction.fromJson(json);
    console.log(transaction);
    if (transaction.isValid(true)) {
      this.blockchain.addTransaction(transaction);
      console.log(`✅ Added transaction to pending transactions.`);
    } else {
      console.error(`❌ Transacion is invalid. Ignoring.`);
    }
  };

  private logHandlerError(requestName: string, error: unknown) {
    console.error(
      `%cError%c handling %c${requestName}%c request: ${error}`,
      "color:red",
      "color:white",
      "text-decoration: underline",
      "color:white",
    );
  }
}
