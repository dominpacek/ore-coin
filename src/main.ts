import { parseArgs } from "jsr:@std/cli/parse-args";
import { Blockchain } from "./blockchain/blockchain.ts";
import { Node } from "./node/node.ts";
import { Wallet } from "./wallet/wallet.ts";

if (import.meta.main) {
  // add evil flag
  const flags = parseArgs(Deno.args, {
    boolean: ["load", "lazy"],
    string: ["host", "port", "join"],
    collect: ["join"],
    default: {
      init: false,
      host: "localhost",
      port: "5801",
    },
    alias: {
      "port": "p",
    },
  });

  const host: string = flags.host;
  const port: number = parseInt(flags.port);
  if (isNaN(port)) {
    console.error(`Invalid port value ${flags.port}`);
    Deno.exit(1);
  }
  const blockchainPath = `./user-files/${port}/`;

  // Create directory for user files (this is where the blockchain will be stored)
  try {
    Deno.mkdirSync(blockchainPath, { recursive: true });
  } catch (e) {
    if (e instanceof Deno.errors.AlreadyExists) {
      // pass
    } else {
      console.error(e);
      Deno.exit(1);
    }
  }

  const filename: string = prompt(
    'Enter the wallet name containing key for your reward ["wallet.json"]: ',
    "wallet.json",
  ) ??
    "wallet.json";
  const password: string = prompt("Enter the wallet password: ") ?? "";

  let rewardAddress: string;
  let wallet: Wallet;
  try {
    wallet = Wallet.openWallet(filename, password);
    console.log("Wallet opened successfully.\n");

    wallet.keys.forEach((key, index) => {
      console.log(
        `[${index}] `,
        wallet.getPublicKey(key),
        "\n",
      );
    });
    const keyIndex = parseInt(
      prompt("Enter the index of the key to use: ") ?? "0",
    );
    if (isNaN(keyIndex) || keyIndex < 0 || keyIndex >= wallet.keys.length) {
      console.error("Invalid key index");
      Deno.exit(1);
    }
    rewardAddress = wallet.getPublicKey(wallet.keys[keyIndex]);

  } catch (e) {
    if (e instanceof Error) {
      console.log("ERROR: ", e.message);
    } else {
      console.log("ERROR: ", e);
    }
    Deno.exit(1);
  }

  const node = new Node(
    host,
    port,
    blockchainPath,
    rewardAddress,
  );

  // Connect to peers
  flags.join.forEach((peer) => {
    node.addPeer(peer, true);
  });

  if (flags.load) {
    const blockchainFile = `${blockchainPath}/blockchain.json`;
    node.blockchain = Blockchain.fromJson(
      Deno.readTextFileSync(blockchainFile),
    );
    console.log("Blockchain loaded from " + blockchainFile);
  } else {
    console.log(`Blockchain will be saved in ${blockchainPath}.`);
    await node.askForBlockchain();
  }

  if (!flags.lazy) {
    console.log("%cWelcome to the valley of mines! ⛏", "color: blue");
    node.setMiner(true);
    node.startMining();
  }
}
