import { Buffer } from "node:buffer";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import elliptic from "npm:elliptic";

const EC = new elliptic.ec("secp256k1");

class Wallet {
  keys: string[];
  fileLocation: string;
  password: string;

  constructor(password: string, fileName: string) {
    this.keys = [];
    this.fileLocation = './user-files/'+fileName;
    this.password = password;
  }

  addPrivateKey() {
    const privateKey = generatePrivateKey();
    this.keys.push(privateKey);
    this.saveWallet();
    console.log("Private key added to wallet");

    return privateKey;
  }

  getPublicKey(private_key: string) {
    const key = EC.keyFromPrivate(private_key, "hex");
    return key.getPublic().encode("hex");
  }

  saveWallet() {
    encryptAndSave(this.keys, this.password, this.fileLocation);
  }

  static createWallet(filePath: string, password: string): Wallet {
    if (existsSync(filePath)) {
      //throw new Error("Wallet already exists");
    }
    const wallet = new Wallet(password, filePath);
    wallet.addPrivateKey();
    encryptAndSave(wallet.keys, password, filePath);

    console.log("Wallet data saved and encrypted");
    return wallet;
  }

  static openWallet(filePath: string, password: string): Wallet {
    const wallet = new Wallet(password, filePath);
    wallet.keys = readWallet(filePath, password);
    return wallet;
  }
}

const generatePrivateKey = (): string => {
  const keyPair = EC.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

// deno-lint-ignore no-explicit-any
function encryptAndSave(data: any, password: string, filePath: string) {
  const salt = randomBytes(16); // Generate a random salt
  const key = scryptSync(password, salt, 32); // Derive key from password
  const iv = randomBytes(16); // Initialization vector
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");

  const fileData = {
    iv: iv.toString("hex"),
    salt: salt,
    content: encrypted,
  };
  writeFileSync(filePath, JSON.stringify(fileData));
}

function readWallet(filePath: string = "private_key", password: string) {
  try {
    const fileData = JSON.parse(readFileSync(filePath, "utf8"));
    const salt = Buffer.from(fileData.salt, "hex"); // Extract salt from file
    const key = scryptSync(password, salt, 32); // Derive key from password and salt
    const iv = Buffer.from(fileData.iv, "hex"); // Extract IV from file
    const decipher = createDecipheriv("aes-256-cbc", key, iv);

    let decrypted = decipher.update(fileData.content, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted); // Return decrypted data
  } catch {
    console.log("Error: Invalid password or file path");
    return;
  }
}

export { Wallet };

