import { Block } from "../blockchain/block.ts";
import { Transaction, TxOut } from "../blockchain/transaction.ts";
import { MINING_REWARD } from "../config.ts";

class Blockchain {
  blocks: Block[] = [];
  pendingTransactions: Transaction[] = []; // Transactions waiting to be mined
  unspentTransactions: Transaction[] = []; // Transactions that aren't spent and can be used as inputs to new transactions
  // TODO properly update the transaction lists

  constructor() {
    this.blocks = [this.startGenesisBlock()];
  }

  startGenesisBlock(): Block {
    return new Block(Date.parse("2025-01-01T00:00:00Z"), []);
  }

  getLatestBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  createNextBlock(rewardAddress: string): Block {
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
    return newBlock;
  }

  addBlock(newBlock: Block) {
    this.blocks.push(newBlock);
    // TODO tutaj usuwanie zrobionych transakcji z pending transactions

  }

  addTransaction(transaction: Transaction) {
    this.pendingTransactions.push(transaction);
    this.unspentTransactions.push(transaction);
  }

  saveBlockchain(path: string): void {
    // Save the whole object to a file
    Deno.writeTextFileSync(path + "blockchain.json", JSON.stringify(this));
    // console.log("Blockchain saved to " + path + "blockchain.json");
  }

  static fromJson(json: string): Blockchain {
    // Load blockchain from a json string
    const obj = JSON.parse(json);
    const blockchain = new Blockchain();
    blockchain.blocks = obj.blocks.map((block: object) =>
      Block.fromJson(block)
    );
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

      // Validate the block with regard to the previous block
      const previousBlock = this.blocks[i - 1];
      if (
        !this.validateBlockAgainstPreviousBlock(
          currentlyCheckingBlock,
          previousBlock,
          verbose,
        )
      ) {
        if (verbose) console.log(`Invalid block at id=${i}.`);
        return false;
      }
    }

    if (verbose) console.log("Blockchain is valid");
    return true;
  }

  isNewBlockValid(newBlock: Block, verbose: boolean = false): boolean {
    // Validate whether new block is valid and can be added to the blockchain

    const latestBlock = this.getLatestBlock();
    return this.validateBlockAgainstPreviousBlock(
      newBlock,
      latestBlock,
      verbose,
    );
  }

  private validateBlockAgainstPreviousBlock(
    nextBlock: Block,
    previousBlock: Block,
    verbose: boolean = false,
  ): boolean {
    // Validate if the block is really the next block in the chain
    if (nextBlock.index !== previousBlock.index + 1) {
      if (verbose) console.log("Invalid index.");
      return false;
    }
    if (nextBlock.previousHash !== previousBlock.hash) {
      if (verbose) console.log("Previous hash does not match.");
      return false;
    }

    // Validate block properties
    if (!nextBlock.isValid(verbose)) {
      return false;
    }
    if (nextBlock.timestamp <= previousBlock.timestamp) {
      if (verbose) {
        console.log(
          "Timestamp is not greater than previous block's timestamp.",
        );
      }
      return false;
    }

    // Validate transactions
    // TODO : big TODO for all this transaction validation stuff
    for (const tx of nextBlock.transactions) {
      if (!tx.isValid(verbose)) {
        return false;
      }
      // Check if transaction is unspent
      if (!this.unspentTransactions.includes(tx)) {
        if (verbose) {
          console.log("Transaction is not unspent.");
        }
        return false;
      }
    }

    // Check if all used transaction inputs sum to 0?

    // Check if there's only one reward transaction
    const rewardTransactions = nextBlock.transactions.filter(
      (tx) => tx.type === "reward",
    );
    if (rewardTransactions.length !== 1) {
      if (verbose) {
        console.log(
          `Invalid number of reward transactions: ${rewardTransactions.length} should be 1.`,
        );
      }
      return false;
    }

    // Check double spending
    const allTransactions = [
      ...previousBlock.transactions,
      ...nextBlock.transactions,
    ];

    const allInputTxIds = allTransactions.map((tx) =>
      tx.inputs.map((input) => input.txOutId + input.txOutIndex)
    ).flat();
    // check if there are any duplicates
    if (new Set(allInputTxIds).size !== allInputTxIds.length) {
      if (verbose) {
        console.log("Double spending detected.");
      }
      return false;
    }

    return true;
  }

  getUnspentTransactionsForAddress(address: string): Transaction[] {
    return this.unspentTransactions.filter((tx) => {
      return tx.outputs.find((output) => output.address === address);
    });
  }

  getBalance(address: string): number {
    const unspentTransactionsForAddress = this.getUnspentTransactionsForAddress(
      address,
    );
    return unspentTransactionsForAddress.reduce((balance, tx) => {
      return balance +
        tx.outputs.reduce(
          (balance, output) =>
            output.address == address ? balance + output.amount : balance,
          0,
        );
    }, 0);
  }

  private validateGenesisBlock(genesisBlock: Block): boolean {
    // Check if the genesis block is as expected
    const expectedGenesisBlock = this.startGenesisBlock();
    return genesisBlock.toHash() === expectedGenesisBlock.toHash() &&
      genesisBlock.isValid();
  }
}

export { Blockchain };
