import { Transaction } from "./transaction.ts";
import { createHash } from "node:crypto";
import { DIFFICULTY } from "../config.ts";
import { setImmediate } from "node:timers/promises";

class Block {
  index: number;
  previousHash: string;
  timestamp: number;
  transactions: Transaction[];
  nonce: number;
  hash: string;
  mining: boolean = false;

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


  mine(): Promise<boolean> {
    this.mining = true;
    return new Promise((resolve) => {
      const mineStep = () => {
        if (!this.mining) {
          resolve(false);
          return;
        }
        for (let i = 0; i < 1000; i++) {  // Mine in batches to reduce the overhead of restarting promise
          if (this.doesHashMatchDifficulty()) {
            resolve(true);
            return;
          }
          // if (this.nonce % 1000 == 0 ) console.log(this.nonce); // Debugging purposes

          this.nonce++;
          this.hash = this.toHash();
        }
        setImmediate(mineStep); // Continue mining without blocking the event loop
      };
      mineStep();
    });
  }

  abortMining(): void {
    this.mining = false;
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

  isValid(verbose: boolean = false): boolean {
    // Basic validation method for the block
    if (!this.isHashValid()) {
      if (verbose) console.log("Invalid hash.");
      return false;
    }
    if (!this.doesHashMatchDifficulty()) {
      if (verbose) console.log(`Hash does not match difficulty. Hash: ${this.hash}, Difficulty: ${DIFFICULTY}`);
      return false;
    }
    if (!this.isTimestampValid()) {
      if (verbose) console.log("Invalid timestamp.");
      return false;
    }
    return true;
  }

  private isHashValid(): boolean {
    // Check if the hash property matches the actual hash of the block
    return this.hash === this.toHash();
  }

  private doesHashMatchDifficulty(): boolean {
    // Check if the hash of the block fulfills the difficulty requirement
    if (this.index === 0) return true; // Genesis block doesn't need to fulfill difficulty

    return this.hash.startsWith(new Array(DIFFICULTY).fill(0).join(""));
  }

  private isTimestampValid(): boolean {
    // Check if the timestamp is in the past
    return this.timestamp <= Date.now();
  }
}

export { Block };
