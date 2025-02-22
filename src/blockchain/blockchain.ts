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
    transactions = [coinbase, ...transactions];
    const newBlock = new Block(
      Date.now(),
      transactions,
      this.getLatestBlock().hash,
      this.getLatestBlock().index + 1
    );
    return newBlock;
  }

  addBlock(newBlock: Block) {
    this.blocks.push(newBlock);

    // Remove transactions in newBlock from pendingTransactions
    this.pendingTransactions = this.pendingTransactions.filter(
      (pendingTx) => !newBlock.transactions.some((tx) => tx.id === pendingTx.id)
    );

    // Add transactions in newBlock to unspentTransactions
    newBlock.transactions.forEach((tx) => {
      this.unspentTransactions.push(tx);
    });

    // Remove txIns in the transactions from unspentTransactions
    newBlock.transactions.forEach((tx) => {
      tx.inputs.forEach((input) => {
        this.unspentTransactions = this.unspentTransactions.filter(
          (unspentTx) =>
            !(
              unspentTx.id === input.txOutId &&
              unspentTx.outputs[input.txOutIndex]
            )
        );
      });
    });
  }

  rollbackBlock() {
    if (this.blocks.length <= 1) {
      console.error("Cannot rollback genesis block");
    }

    const latestBlock = this.blocks.pop();

    if (latestBlock) {
      // Re-add transactions in latestBlock to pendingTransactions
      this.pendingTransactions = [
        ...latestBlock.transactions,
        ...this.pendingTransactions,
      ];

      // Revert unspent transactions
      latestBlock.transactions.forEach((tx) => {
        // Remove transactions in latestBlock from unspentTransactions
        this.unspentTransactions = this.unspentTransactions.filter(
          (unspentTx) => unspentTx.id !== tx.id
        );

        // Add txIns in the transactions back to unspentTransactions
        tx.inputs.forEach((input) => {
          const spentTx = this.blocks
            .flatMap((block) => block.transactions)
            .find((unspentTx) => unspentTx.id === input.txOutId);
          if (spentTx) {
            this.unspentTransactions.push(spentTx);
          }
        });
      });
    }
  }

  addTransaction(transaction: Transaction) {
    console.log("New transaction added to pending.");
    this.pendingTransactions.push(transaction);
  }

  replaceBlockchain(newBlockchain: Blockchain) {
    console.log("Replacing blockchain.");
    if (newBlockchain.isValid()) {
      // Rollback blocks that are different
      while (this.blocks.length > 1 && this.blocks[this.blocks.length - 1].hash !== newBlockchain.blocks[this.blocks.length - 1].hash) {
      this.rollbackBlock();
      }

      // Add new blocks from newBlockchain
      for (let i = this.blocks.length; i < newBlockchain.blocks.length; i++) {
      this.addBlock(newBlockchain.blocks[i]);
      }

      // Validate pending transactions
      if (JSON.stringify(this.pendingTransactions) !== JSON.stringify(newBlockchain.pendingTransactions)) {
      console.error("Pending transactions do not match.");
      return;
      }

      // Validate unspent transactions
      if (JSON.stringify(this.unspentTransactions) !== JSON.stringify(newBlockchain.unspentTransactions)) {
      console.error("Unspent transactions do not match.");
      return;
      }

      console.log("Blockchain replaced successfully.");
    } else {
      console.error("New blockchain is not valid.");
    }
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
          verbose
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
      verbose
    );
  }

  private validateBlockAgainstPreviousBlock(
    nextBlock: Block,
    previousBlock: Block,
    verbose: boolean = false
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
          "Timestamp is not greater than previous block's timestamp."
        );
      }
      return false;
    }

    // Validate transactions
    for (const tx of nextBlock.transactions) {
      if (!tx.isValid(verbose)) {
      return false;
      }
      // Check if all transaction inputs are unspent
      for (const input of tx.inputs) {
      if (
        !this.unspentTransactions.some(
        (unspentTx) => unspentTx.id === input.txOutId
        ) && tx.type !== "reward"
      ) {
        if (verbose) {
        console.log(`Transaction input ${input.txOutId} is not unspent.`);
        }
        return false;
      }
      }
    }

    // Check if all used transaction inputs sum to 0?

    // Check if there's only one reward transaction
    const rewardTransactions = nextBlock.transactions.filter(
      (tx) => tx.type === "reward"
    );
    if (rewardTransactions.length !== 1) {
      if (verbose) {
        console.log(
          `Invalid number of reward transactions: ${rewardTransactions.length} should be 1.`
        );
      }
      return false;
    }

    // Check double spending
    const allTransactions = [
      ...previousBlock.transactions,
      ...nextBlock.transactions,
    ];

    const allInputTxIds = allTransactions
      .map((tx) => tx.inputs.map((input) => input.txOutId + input.txOutIndex))
      .flat();
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
    const unspentTransactionsForAddress =
      this.getUnspentTransactionsForAddress(address);
    return unspentTransactionsForAddress.reduce((balance, tx) => {
      return (
        balance +
        tx.outputs.reduce(
          (balance, output) =>
            output.address == address ? balance + output.amount : balance,
          0
        )
      );
    }, 0);
  }

  private validateGenesisBlock(genesisBlock: Block): boolean {
    // Check if the genesis block is as expected
    const expectedGenesisBlock = this.startGenesisBlock();
    return (
      genesisBlock.toHash() === expectedGenesisBlock.toHash() &&
      genesisBlock.isValid()
    );
  }
}

export { Blockchain };
