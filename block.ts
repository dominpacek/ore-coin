
import { Transaction } from './transaction.ts';
import { createHash } from 'node:crypto';

/*
{ // Block
    "index": 0, // (first block: 0)
    "previousHash": "0", // (hash of previous block, first block is 0) (64 bytes)
    "timestamp": 1465154705, // number of seconds since January 1, 1970
    "nonce": 0, // nonce used to identify the proof-of-work step.
    "transactions": [ // list of transactions inside the block
        { // transaction 0
            "id": "63ec3ac02f...8d5ebc6dba", // random id (64 bytes)
            "hash": "563b8aa350...3eecfbd26b", // hash taken from the contents of the transaction: sha256 (id + data) (64 bytes)
            "type": "regular", // transaction type (regular, fee, reward)
            "data": {
                "inputs": [], // list of input transactions
                "outputs": [] // list of output transactions
            }
        }
    ],
    "hash": "c4e0b8df46...199754d1ed" // hash taken from the contents of the block: sha256 (index + previousHash + timestamp + nonce + transactions) (64 bytes)
}
*/

class Block {
    index: number;
    previousHash: string;
    timestamp: number;
    transactions: Transaction[];
    nonce: number;
    hash: string;

    constructor(timestamp: number, transactions: Transaction[], previousHash = '', index = 0) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.nonce = 0;
        this.hash = this.toHash();
    }

    toHash() {
        return createHash('sha256')
            .update(this.index + this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce)
            .digest('hex');
    }

    mine(difficulty: number) {
        console.log('Start mining...')
        console.log('Mining block with difficulty: ' + difficulty)
        while (!this.hash.startsWith(new Array(difficulty).fill(0).join(''))) {
          this.nonce++
          this.hash = this.toHash()
        }
        console.log('Mining finished! Nonce: ' + this.nonce + ' Hash: ' + this.hash)
      }

}

export { Block}