// double spending test

import { Blockchain } from "../src/blockchain/blockchain.ts";
import { Wallet } from "../src/wallet/wallet.ts";
import { Transaction, TxIn, TxOut } from "../src/blockchain/transaction.ts";
import elliptic from "npm:elliptic";

const EC = new elliptic.ec("secp256k1");

const private1 =
  "a564a3afa22b508365d4d2ccc180f75532ebc26ce676701ac2de3fda0a1abeb6";
const public1 =
  "04592908ffd0c7ba2969b400f3e119663fc229497c1b009ed81fe27a1d319b37115d21c3978558417baf7b9ee82408ee80792c37c7883dbc4b5b3d0933d57f593f";

const private2 =
  "314020a77008e86e583ed0ee4c4caefdbc6380179949d1262c7218be40a082b0";
const public2 =
  "04dad165ca6257e817fdb20206489d2ed1f3aa5c197c0b4f82a326fecf4ec57cf9b3962bf9133824ce1b1c18b9824cb0ac28233ed51bc83911b563d34d28834921";

const createTransaction = (
  fromKey: string,
  toAddress: string,
  amount: number,
  blockchain: Blockchain,
) => {
  const fromAddress = Wallet.getPublicKey(fromKey);

  const txIns: TxIn[] = [];
  const txOuts: TxOut[] = [new TxOut(toAddress, amount)];
  const unspentTransactions = blockchain.getUnspentTransactionsForAddress(
    fromAddress,
  );

  let currentAmount = 0;
  let change = 0;
  let i = 0;

  while (currentAmount < amount) {
    const tx = unspentTransactions[i++];
    tx.outputs.forEach((output, index) => {
      if (output.address === fromAddress) {
        const newTxIn = new TxIn(tx.id, index, output.amount, output.address);
        newTxIn.signInput(EC.keyFromPrivate(fromKey, "hex"));
        txIns.push(newTxIn);
        currentAmount += output.amount;
      }
    });
  }

  change = currentAmount - amount;

  if (change > 0) {
    txOuts.push(new TxOut(fromAddress, change));
  }

  const transaction = new Transaction(txIns, txOuts);
  transaction.hash = transaction.calculateHash();

  return transaction;
};

const blockchain = new Blockchain();
// generate some money for public1 (reward)
const newBlock = blockchain.createNextBlock(public1);
await newBlock.mine();
blockchain.addBlock(newBlock);

// public1 sends 10 to public2
const transaction = createTransaction(private1, public2, 40, blockchain);
blockchain.addTransaction(transaction);

// double spending
//const transaction2 = createTransaction(private1, public2, 40, blockchain);
//blockchain.addTransaction(transaction2);

// public 1 mines a block
const newBlock2 = blockchain.createNextBlock(public1);
await newBlock2.mine();


console.log("blockchain valid: " + blockchain.isNewBlockValid(newBlock2, true));

if (blockchain.isNewBlockValid(newBlock2)) {
  blockchain.addBlock(newBlock2);
}

console.log("public 1 balance: " + blockchain.getBalance(public1));
console.log("public 2 balance: " + blockchain.getBalance(public2));
