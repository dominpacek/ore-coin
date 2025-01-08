import { Block } from "../blockchain/block.ts";
import { Transaction, TxOut } from "../blockchain/transaction.ts";

class Blockchain {
  difficulty: number = 4;
  reward: number = 10; // Coinbase amount
  blocks: Block[] = [];
  pendingTransactions: Transaction[] = []; // Transactions waiting to be mined
  unspentTransactions: Transaction[] = []; // Transactions that aren't spent and can be used as inputs to new transactions

  constructor(
    genesisBlock: Block | undefined,
    difficulty: number = 4,
    reward: number = 10,
    coinbaseAddress: string
  ) {
    this.blocks = [genesisBlock ?? this.startGenesisBlock(coinbaseAddress)];
    this.difficulty = difficulty;
    this.reward = reward;
  }

  startGenesisBlock(address:string): Block {
    const coinbaseTransaction = new Transaction([], [new TxOut(address, 1000)]);
    return new Block(Date.parse("2025-01-01T00:00:00Z"), [coinbaseTransaction], "0", 0);
  }

  getLatestBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  // na razie kopanie bez transakcji
  mineBlock() {
    const newBlock = new Block(
      Date.now(),
      [],
      this.getLatestBlock().hash,
      this.getLatestBlock().index + 1,
    );
    newBlock.mine(this.difficulty);
    return newBlock;
  }

  saveBlockChain(path: string): void {
    // save whole object to file
    Deno.writeTextFileSync(path + "blockchain.json", JSON.stringify(this));
    console.log("Blockchain saved");
  }

  static fromJson(json: string): Blockchain {
    // load whole object from file
    const obj = JSON.parse(json);
    //console.log(obj);
    const blockchain = new Blockchain(undefined, obj.difficulty, obj.reward, "");
    blockchain.blocks = obj.blocks.map((block: any) => Block.fromJson(block));
    return blockchain;
  }
  
  isValid(): boolean {
    for (let i = 1; i < this.blocks.length; i++) {
      if (this.blocks[i].hash !== this.blocks[i].toHash()) {
        console.log(`Block ${i} hash is invalid`);
        return false;
      }
      if (this.blocks[i].previousHash !== this.blocks[i - 1].toHash()) {
        console.log(`Block ${i} previous hash is invalid`);
        return false;
      }
    }
    console.log("Blockchain is valid");
    return true;
  }

  getUnspentTransactions(address: string): Transaction[] {
    return this.unspentTransactions.filter((tx) => {
      return tx.outputs.find((output) => output.address === address);
    });
  }
}

export { Blockchain };
