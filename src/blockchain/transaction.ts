import elliptic from "npm:elliptic";
import { createHash } from "node:crypto";
import { verifySignature } from "../wallet/cryptographyUtils.ts";
import { randomBytes } from "node:crypto";
import { MINING_REWARD } from "../config.ts";

export class Transaction {
  id: string;
  hash: string;
  type: string; // regular, reward
  inputs: TxIn[];
  outputs: TxOut[];

  constructor(TxIns: TxIn[], TxOuts: TxOut[]) {
    this.id = randomBytes(Math.floor(32)).toString("hex");
    this.type = "regular";
    this.inputs = TxIns;
    this.outputs = TxOuts;
    this.hash = this.calculateHash();
  }

  static newCoinbaseTx(address: string, reward: number): Transaction {
    const txOut = new TxOut(address, reward);
    const coinbase = new Transaction([], [txOut]);
    coinbase.type = "reward";
    coinbase.hash = coinbase.calculateHash();
    return coinbase;
  }

  calculateHash(): string {
    return createHash("sha256")
      .update(
        this.id +
          this.type +
          JSON.stringify(this.inputs) +
          JSON.stringify(this.outputs),
      )
      .digest("hex");
  }

  isValid(verbose: boolean = false): boolean {
    if (this.hash !== this.calculateHash()) {
      if (verbose) {
        console.error(
          `Transaction not valid: Invalid transaction hash ${this.hash} !== ${this.calculateHash()}`,
        );
      }
      return false;
    }

    for (const txInput of this.inputs) {
      const txInputHash = txInput.toHash();
      const isValidSignature = verifySignature(
        txInput.address,
        txInput.signature,
        txInputHash,
      );

      if (!isValidSignature) {
        if (verbose) {
          console.error(
            `Invalid transaction input signature '${JSON.stringify(txInput)}'`,
          );
        }
        return false;
      }
    }

    if (this.type === "regular") {
      const totalInputAmount = this.inputs.reduce(
        (acc, txIn) => acc + txIn.amount,
        0,
      );
      const totalOutputAmount = this.outputs.reduce(
        (acc, txOut) => acc + txOut.amount,
        0,
      );

      if (totalInputAmount !== totalOutputAmount) {
        if (verbose) {
          console.error(
            `Invalid transaction: total input amount ${totalInputAmount} is not equal to total output amount ${totalOutputAmount}`,
          );
        }
        return false;
      }
    } else if (this.type === "reward") {
      if (this.outputs.length !== 1) {
        if (verbose) {
          console.error(
            `Invalid transaction: reward transaction should have exactly one output`,
          );
        }
        return false;
      }
      if (this.outputs[0].amount !== MINING_REWARD) {
        if (verbose) {
          console.error(
            `Invalid transaction: reward transaction should have 50 coins`,
          );
        }
        return false;
      }
      if (this.inputs.length !== 0) {
        if (verbose) {
          console.error(
            `Invalid transaction: reward transaction should have no inputs`,
          );
        }
        return false;
      }
    } else {
      if (verbose) {
        console.error(
          `Invalid transaction: unknown transaction type '${this.type}'`,
        );
      }
      return false;
    }

    return true;
  }

  toJson(): string {
    return JSON.stringify(this);
  }

  static fromJson(json: string): Transaction {
    const obj = JSON.parse(json);
    const txIns = obj.inputs.map((txIn: object) => TxIn.fromJson(txIn));
    const txOuts = obj.outputs.map((txOut: object) => TxOut.fromJson(txOut));
    const transaction = new Transaction(txIns, txOuts);
    transaction.id = obj.id;
    transaction.hash = obj.hash;
    transaction.type = obj.type;
    return transaction;
  }
}

export class TxOut {
  address: string;
  amount: number;

  constructor(address: string, amount: number) {
    this.address = address;
    this.amount = amount;
  }

  static fromJson(json: any): TxOut {
    return new TxOut(json.address, json.amount);
  }
}

export class TxIn {
  txOutId: string;
  txOutIndex: number;
  amount: number;
  address: string;
  signature: string;

  constructor(
    txOutId: string,
    txOutIndex: number,
    amount: number,
    address: string,
  ) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.amount = amount;
    this.address = address;
    this.signature = "";
  }

  toHash(): string {
    return createHash("sha256")
      .update(this.txOutId + this.txOutIndex + this.amount + this.address)
      .digest("hex");
  }

  signInput(signingKey: elliptic.ec.KeyPair): void {
    const hash = this.toHash();
    const sig = signingKey.sign(hash, "base64");
    this.signature = sig.toDER("hex");
  }

  static fromJson(json: any): TxIn {
    const txin = new TxIn(
      json.txOutId,
      json.txOutIndex,
      json.amount,
      json.address,
    );
    txin.signature = json.signature;
    return txin;
  }
}
