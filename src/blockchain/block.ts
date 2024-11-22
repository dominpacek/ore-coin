import { Transaction } from "./transaction.ts";
import { createHash } from "node:crypto";

class Block {
  index: number;
  previousHash: string;
  timestamp: number;
  transactions: Transaction[];
  nonce: number;
  hash: string;

  constructor(
    timestamp: number,
    transactions: Transaction[],
    previousHash = "",
    index = 0,
    nonce: number = 0,
  ) {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.nonce = nonce;
    this.hash = this.toHash();
  }

  toHash() {
    return createHash("sha256")
      .update(
        this.index + this.previousHash + this.timestamp +
          JSON.stringify(this.transactions) + this.nonce,
      )
      .digest("hex");
  }

  mine(difficulty: number) {
    console.log("Start mining...");
    console.log("Mining block with difficulty: " + difficulty);
    while (!this.hash.startsWith(new Array(difficulty).fill(0).join(""))) {
      this.nonce++;
      this.hash = this.toHash();
    }
    console.log(
      "Mining finished! Nonce: " + this.nonce + " Hash: " + this.hash,
    );
  }

  static fromJson(block: any) {
    // const transactions = block.transactions.map((transaction: any) =>
    //     Transaction.fromJson(transaction)
    // );
    return new Block(
      block.timestamp,
      [],
      block.previousHash,
      block.index,
      block.nonce,
    );
  }
}

export { Block };
