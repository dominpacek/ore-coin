import elliptic from "npm:elliptic";
import { createHash } from "node:crypto";
import { getPublicKey } from "../wallet/cryptographyUtils.ts";

export class Transaction {
  id: null;
  hash: string;
  type: string; // regular, reward
  inputs: TxIn[];
  outputs: TxOut[];

  constructor(TxIns: TxIn[], TxOuts: TxOut[]) {
    this.id = null;
    this.hash = "";
    this.type = "regular";
    this.inputs = TxIns;
    this.outputs = TxOuts;
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

  signTransaction(signingKey: elliptic.ec.KeyPair): void {
    const hash = this.calculateHash();
    const sig = signingKey.sign(hash, "base64");
    this.id = sig.toDER("hex");
  }

  isValid(): boolean {
    return true;
  }

  toJson(): string {
    return JSON.stringify(this);
  }
}

export class TxOut {
  address: string;
  amount: number;

  constructor(address: string, amount: number) {
    this.address = address;
    this.amount = amount;
  }
}

export class TxIn {
  txOutId: string;
  txOutIndex: number;
  signature: string;

  constructor(txOutId: string, txOutIndex: number, signature: string) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.signature = signature;
  }
}
