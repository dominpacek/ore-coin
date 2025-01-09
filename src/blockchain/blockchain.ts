import { Block } from "../blockchain/block.ts";
import { Transaction, TxOut } from "../blockchain/transaction.ts";
import { MINING_REWARD } from "../config.ts";

class Blockchain {
  blocks: Block[] = [];
  pendingTransactions: Transaction[] = []; // Transactions waiting to be mined
  unspentTransactions: Transaction[] = []; // Transactions that aren't spent and can be used as inputs to new transactions

  constructor() {
    this.blocks = [this.startGenesisBlock()];
  }

  startGenesisBlock(): Block {
    return new Block(Date.parse("2025-01-01T00:00:00Z"), []);
  }

  getLatestBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  mineBlock(rewardAddress: string): Block {
    let transactions = this.pendingTransactions;
    this.pendingTransactions = [];
    const coinbase = Transaction.newCoinbaseTx(rewardAddress, MINING_REWARD);
    this.unspentTransactions.push(coinbase);
    transactions = [coinbase, ...transactions];

    const newBlock = new Block(
      Date.now(),
      transactions,
      this.getLatestBlock().hash,
      this.getLatestBlock().index + 1,
    );
    newBlock.mine();
    return newBlock;
  }



  saveBlockChain(path: string): void {
    // Save the whole object to a file
    Deno.writeTextFileSync(path + "blockchain.json", JSON.stringify(this));
    console.log("Blockchain saved to " + path + "blockchain.json");
  }

  static fromJson(json: string): Blockchain {
    // Load blockchain from a json string
    const obj = JSON.parse(json);
    const blockchain = new Blockchain();
    blockchain.blocks = obj.blocks.map((block: object) => Block.fromJson(block));
    blockchain.pendingTransactions = obj.pendingTransactions.map((tx: object) =>
      Transaction.fromJson(JSON.stringify(tx))
    );
    blockchain.unspentTransactions = obj.unspentTransactions.map((tx: object) =>
      Transaction.fromJson(JSON.stringify(tx))
    );
    return blockchain;
  }

  isValid(verbose: boolean = false): boolean {
    // Complete validation method for the blockchain
    if (!this.validateGenesisBlock(this.blocks[0])) {
      if (verbose) console.log("Invalid genesis block.");
      return false;
    }

    for (let i = 1; i < this.blocks.length; i++) {
      const currentlyCheckingBlock = this.blocks[i];

      // Check if the index is correct
      if (currentlyCheckingBlock.index !== i) {
        if (verbose) console.log(`Expected block id=${i}, got ${currentlyCheckingBlock.index}.`);
        return false;
      }
      // Validate the block
      const previousBlock = this.blocks[i - 1];
      if (!currentlyCheckingBlock.isValid(previousBlock, verbose)) {
        if (verbose) console.log(`Invalid block at id=${i}.`);
        return false;
      }
    }

    // TODO validate transactions after they're implemented

    if (verbose) console.log("Blockchain is valid");
    return true;
  }

  getUnspentTransactionsForAddress(address: string): Transaction[] {
    return this.unspentTransactions.filter((tx) => {
      return tx.outputs.find((output) => output.address === address);
    });
  }

  getBalance(address: string): number {
    const unspentTransactionsForAddress = this.getUnspentTransactionsForAddress(address);
    return unspentTransactionsForAddress.reduce((balance, tx) => {
      return balance + tx.outputs.reduce((balance, output) => balance + output.amount, 0);
    }, 0);
  }
  
  private validateGenesisBlock(genesisBlock: Block): boolean {
    // Check if the genesis block is as expected
    const expectedGenesisBlock = this.startGenesisBlock();
    return genesisBlock.toHash() === expectedGenesisBlock.toHash() &&
      genesisBlock.isValidAlone();
  }
}

export { Blockchain };
