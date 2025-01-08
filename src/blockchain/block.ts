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
        this.index +
          this.previousHash +
          this.timestamp +
          JSON.stringify(this.transactions) + this.nonce,
      )
      .digest("hex");
  }

  mine(difficulty: number) {
    console.log("Start mining...");
    // Keep mining the block until the hash matches the difficulty
    while (!this.doesHashMatchDifficulty(difficulty)) {
      this.nonce++;
      this.hash = this.toHash();
    }
    console.log(
      "Mining finished! Nonce: " + this.nonce + " Hash: " + this.hash,
    );
  }

  static fromJson(block: any) {
    const transactions = block.transactions.map((transaction: object) =>
        Transaction.fromJson(JSON.stringify(transaction))
    );
    return new Block(
      block.timestamp,
      transactions,
      block.previousHash,
      block.index,
      block.nonce,
    );
  }

  isValidAlone(difficulty: number): boolean {
    // Validation method for the block by itself (disregarding the previous block)
    return this.isHashValid() &&
      this.doesHashMatchDifficulty(difficulty) &&
      this.isTimestampValid();
  }
  
  isValid(previousBlock: Block, difficulty: number, verbose: boolean = false): boolean {
    // Complete validation method for the block considering the previous block.
    if (!this.isHashValid()) {
      if (verbose) console.log("Invalid hash.");
      return false;
    }
    if (!this.doesHashMatchDifficulty(difficulty)) {
      if (verbose) console.log("Hash does not match difficulty.");
      return false;
    }
    if (!this.isTimestampValid()) {
      if (verbose) console.log("Invalid timestamp.");
      return false;
    }
    if (this.previousHash !== previousBlock.hash) {
      if (verbose) console.log("Previous hash does not match.");
      return false;
    }
    if (this.index !== previousBlock.index + 1) {
      if (verbose) console.log("Invalid index.");
      return false;
    }
    if (this.timestamp <= previousBlock.timestamp) {
      if (verbose) console.log("Timestamp is not greater than previous block's timestamp.");
      return false;
    }
    return true;
  }

  private isHashValid(): boolean {
    // Check if the hash property matches the actual hash of the block
    return this.hash === this.toHash();
  }

  private doesHashMatchDifficulty(difficulty: number): boolean {
    // Check if the hash of the block fulfills the difficulty requirement
    if (this.index === 0) return true; // Genesis block doesn't need to fulfill difficulty

    return this.hash.startsWith(new Array(difficulty).fill(0).join(""));
  }

  private isTimestampValid(): boolean {
    // Check if the timestamp is in the past
    return this.timestamp <= Date.now();
  }
}

export { Block };
