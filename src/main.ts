import { parseArgs } from "jsr:@std/cli/parse-args";
import { exit } from "node:process";
import { Blockchain } from "./blockchain/blockchain.ts";
import { GenericMessage } from "./node/genericMessage.ts";
import { Wallet } from "./wallet/wallet.ts";
import { Node } from "./node/node.ts";
import { sleep } from "https://deno.land/x/sleep/mod.ts";

let node: Node;
// Entry point of the program
if (import.meta.main) {
  // create directory for user files
  try {
    Deno.mkdirSync("user-files");
  } catch (e) {
    if (e instanceof Deno.errors.AlreadyExists) {
      // pass
    } else {
      console.error(e);
      Deno.exit(1);
    }
  }

  console.log(`%cWitaj w Górniczej Dolinie! ⛏`, "color: blue");

  const flags = parseArgs(Deno.args, {
    boolean: ["init", "wallet"],
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

  //console.log(flags);

  if (flags.wallet) {
    let wallet: Wallet;
    while (true) {
      console.log("\n@@ Zarządzanie portfelem @@");
      console.log("1: Utwórz nowy portfel");
      console.log("2: Otwórz istniejący portfel");
      const choice = prompt("Wybierz opcję: ");
      if (choice == "1") {
        const filename: string =
          prompt('Podaj nazwę pliku ["wallet.json"]: ', "wallet.json") ??
            "wallet.json";
        const password: string = prompt("Podaj hasło do portfela: ") ?? "";

        wallet = Wallet.createWallet(filename, password);
        console.log("Utworzono portfel.\n");
        break;
      } else if (choice == "2") {
        const filename: string =
          prompt('Podaj nazwę pliku ["wallet.json"]: ', "wallet.json") ??
            "wallet.json";
        const password: string = prompt("Podaj hasło do portfela: ") ?? "";
        try {
          wallet = Wallet.openWallet(filename, password);
          console.log("Portfel został poprawnie otwarty.");
        } catch (e) {
          if (e instanceof Error) {
            console.log("ERROR: ", e.message);
          } else {
            console.log("ERROR: ", e);
          }
          continue;
        }
        break;
      }
    }

    console.log("1: Wypisz dostępne klucze");
    console.log("2: Dodaj nowy, losowy klucz");
    console.log("3: Zapisz i wyjdź");

    while (true) {
      const choice = prompt("\nWybierz opcję");

      if (choice == "1") {
        wallet.keys.forEach((key) => {
          console.log(
            "Private: ",
            key,
            "\nPublic: ",
            wallet.getPublicKey(key),
            "\n\n",
          );
        });
      } else if (choice == "2") {
        wallet.addPrivateKey();
      } else if (choice == "3") {
        wallet.saveWallet();
        exit();
      }
    }
  }

  const host: string = flags.host;
  const port: number = parseInt(flags.port);
  if (isNaN(port)) {
    console.error(`Invalid port value ${flags.port}`);
    Deno.exit(1);
  }

  try {
    Deno.mkdirSync(`user-files/${port}`);
  } catch (e) {
    if (e instanceof Deno.errors.AlreadyExists) {
      // pass
    } else {
      console.error(e);
      Deno.exit(1);
    }
  }
  const blockchainPath = `user-files/${port}/`;

  node = new Node(host, port, blockchainPath);
  flags.join.forEach((peer) => {
    node.addPeer(peer, true);
  });
  // if (node.peers && node.peers.length > 0) {
  //   node.sayHi(node.peers[node.peers.length - 1]);
  // }

  if (flags.init) {
    node.blockchain = new Blockchain(undefined, 5, 10);
    node.blockchain.saveBlockChain(blockchainPath);
  } else if (flags.join) {
    await node.askForBlockchain();
  } else {
    node.blockchain = Blockchain.fromJson(
      Deno.readTextFileSync(blockchainPath),
    );
  }

  if (flags.init) {
    while (true) {
      node.mineBlock();
      await sleep(5);
    }
    // node.blockchain.saveBlockChain(blockchainPath);
  }

  //console.log(`%cEnter message or "exit" to quit.`, "color: gray");
  //readInput().catch((err) => console.error(err));
}

// Read user input wihtout blocking the event loop
async function readInput() {
  const decoder = new TextDecoder();
  const buf = new Uint8Array(1024);

  while (true) {
    const n = await Deno.stdin.read(buf);
    if (n === null) break; // EOF
    const input = decoder.decode(buf.subarray(0, n)).trim();

    // Process user input
    if (input.toLowerCase() === "exit") {
      console.log("Exiting...");
      Deno.exit(0);
    } else if (input.toLowerCase() === "peers") {
      console.log(`Peers: ${node.peers.join(", ")}`);
    } else {
      await node.broadcast(new GenericMessage(input));
    }
  }
}
