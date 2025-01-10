import { parseArgs } from "jsr:@std/cli/parse-args";
import { exit } from "node:process";
import { Blockchain } from "./blockchain/blockchain.ts";
import { BlockchainMessage } from "./node/blockchainMessage.ts";
import { Wallet } from "./wallet/wallet.ts";
import { Node } from "./node/node.ts";
import { sleep } from "https://deno.land/x/sleep/mod.ts";

let node: Node;
// Entry point of the program
if (import.meta.main) {
  // Create directory for user files (this is where the blockchain will be stored)
  try {
    Deno.mkdirSync("./user-files");
  } catch (e) {
    if (e instanceof Deno.errors.AlreadyExists) {
      // pass
    } else {
      console.error(e);
      Deno.exit(1);
    }
  }

  console.log("%cWitaj w Górniczej Dolinie! ⛏", "color: blue");

  // TODO cleanup flags
  // add join flag, evil flag
  const flags = parseArgs(Deno.args, {
    boolean: ["init", "wallet", "mine"],
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

  if (flags.wallet) {
    // TODO wydzielić do osobnego pliku
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
    console.log("3: Wyślij pieniądze");
    console.log("4: Sprawdź saldo");
    console.log("Q: Zapisz i wyjdź");

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
        // TODO get blockchain
        const blockchain = await Node.askForBlockchainFromPeer(
          "http://localhost:5801",
        );

        if (!blockchain) {
          console.log("Couldn't download blockchain\n\n");
          continue;
        }

        const toAddress = prompt("Podaj adres odbiorcy: ");
        if (toAddress == null) {
          console.log("Nie podano adresu odbiorcy!!\n\n");
          continue;
        }
        console.log("Wybierz klucz prywatny: ");
        wallet.keys.forEach((key, index) => {
          console.log(
            `[${index}] `,
            key,
            "\n",
          );
        });

        const keyNumber: number = parseInt(prompt("Wybierz klucz: ") ?? "");
        const fromKey = wallet.keys[keyNumber];

        const amount = parseInt(prompt("Podaj kwotę: ") ?? "");
        try {
          const transaction = wallet.createTransaction(
            toAddress,
            fromKey,
            amount,
            blockchain,
          );
          console.log(transaction.toJson());
        } catch (e) {
          if (e instanceof Error) {
            console.log("ERROR: ", e.message);
          }
          continue;
        }
      } else if (choice == "4") {
        // TODO get blockchain
        const blockchain = await Node.askForBlockchainFromPeer(
          "http://localhost:5801",
        );

        if (!blockchain) {
          console.log("Couldn't download blockchain\n\n");
          continue;
        }

        wallet.keys.forEach((key) => {
          console.log(
            "Public: ",
            wallet.getPublicKey(key),
            "\nSaldo: ",
            blockchain.getBalance(wallet.getPublicKey(key)),
            "\n\n",
          );
        });
      } else if (choice == "Q") {
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
    Deno.mkdirSync(`./user-files/${port}`);
  } catch (e) {
    if (e instanceof Deno.errors.AlreadyExists) {
      // pass
    } else {
      console.error(e);
      Deno.exit(1);
    }
  }
  const blockchainPath = `./user-files/${port}/`;

  node = new Node(host, port, blockchainPath);
  console.log(`Blockchain will be saved in ${blockchainPath}.`);
  flags.join.forEach((peer) => {
    node.addPeer(peer, true);
  });
  // if (node.peers && node.peers.length > 0) {
  //   node.sayHi(node.peers[node.peers.length - 1]);
  // }

  if (flags.init) {
    // TODO dodać adres dla coinbase
    node.blockchain = new Blockchain();
    node.blockchain.saveBlockChain(blockchainPath);
  } else if (flags.join) {
    await node.askForBlockchain();
  } else {
    node.blockchain = Blockchain.fromJson(
      Deno.readTextFileSync(blockchainPath),
    );
  }

  if (flags.mine) {
    while (true) {
      node.mineBlock("043252ac6149f3373bfe1f787b0b886919a7e9a038b53fc55c699d19993f4cfff23f405079e2261adea04742355315f85745cdf9466c7813f86d7c6740aca8e858");
      await sleep(5);
      node.blockchain.saveBlockChain(blockchainPath);
    }
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
      await node.broadcast(new BlockchainMessage(input));
    }
  }
}
