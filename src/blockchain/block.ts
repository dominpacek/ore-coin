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

  toHash(): string {
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
    while (!this.doesHashMatchDifficulty(difficulty)) {
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

  isValid(difficulty: number): boolean {
    // Complete validation method for the block
    return this.isHashValid() &&
      this.doesHashMatchDifficulty(difficulty)
      && this.isTimestampValid();
  }

  private isHashValid(): boolean {
    // Check if the hash property matches the actual hash of the block
    return this.hash === this.toHash();
  }

  
  private doesHashMatchDifficulty(difficulty: number): boolean {
    // Check if the hash of the block fulfills the difficulty requirement
    if (this.index === 0) return true; // Genesis block doesn't need to match this
    
    return this.hash.startsWith(new Array(difficulty).fill(0).join(""));
  }
  
  private isTimestampValid(): boolean {
    // Check if the timestamp is in the past 
    return this.timestamp <= Date.now();
  }
  
}

export { Block };
