import { Block } from "../blockchain/block.ts";

class Blockchain {
  difficulty: number = 4;
  reward: number = 10;
  blocks: Block[] = [];

  constructor(
    genesisBlock: Block | undefined,
    difficulty: number = 4,
    reward: number = 10,
  ) {
    this.blocks = [genesisBlock ?? this.startGenesisBlock()];
    this.difficulty = difficulty;
    this.reward = reward;
  }

  startGenesisBlock(): Block {
    return new Block(Date.now(), []);
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
    const blockchain = new Blockchain(undefined, obj.difficulty, obj.reward);
    blockchain.blocks = obj.blocks;
    return blockchain;
  }
}

export { Blockchain };