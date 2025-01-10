import { exit } from "node:process";
import { Node } from "./node/node.ts";
import { Wallet } from "./wallet/wallet.ts";

if (import.meta.main) {
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

    let wallet: Wallet;
    while (true) {
        console.log("\n@@ Wallet Management @@");
        console.log("1: Create a new wallet");
        console.log("2: Open an existing wallet");
        const choice = prompt("Choose an option: ");
        if (choice == "1") {
            const filename: string =
                prompt('Enter the file name ["wallet.json"]: ', "wallet.json") ??
                    "wallet.json";
            const password: string = prompt("Enter the wallet password: ") ?? "";

            wallet = Wallet.createWallet(filename, password);
            console.log("Wallet created.\n");
            break;
        } else if (choice == "2") {
            const filename: string =
                prompt('Enter the file name ["wallet.json"]: ', "wallet.json") ??
                    "wallet.json";
            const password: string = prompt("Enter the wallet password: ") ?? "";
            try {
                wallet = Wallet.openWallet(filename, password);
                console.log("Wallet opened successfully.");
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

    console.log("1: List available keys");
    console.log("2: Add a new random key");
    console.log("3: Send money");
    console.log("4: Check balance");
    console.log("Q: Save and exit");

    while (true) {
        const choice = prompt("\nChoose an option");

        if (choice == "1") {
            wallet.keys.forEach((key) => {
                console.log(
                    "Private: ",
                    key,
                    "\nPublic: ",
                    Wallet.getPublicKey(key),
                    "\n\n",
                );
            });
        } else if (choice == "2") {
            wallet.addPrivateKey();
        } else if (choice == "3") {
            const port = prompt("Enter peer port: ", "5801") ?? "5801";   
            
            const peer = "http://localhost:" + port;

            const blockchain = await Node.askForBlockchainFromPeer(
                peer
            );

            if (!blockchain) {
                console.log("Couldn't download blockchain\n\n");
                continue;
            }

            const toAddress = prompt("Enter recipient address: ");
            if (toAddress == null) {
                console.log("Recipient address not provided!!\n\n");
                continue;
            }
            console.log("Choose a private key: ");
            wallet.keys.forEach((key, index) => {
                console.log(
                    `[${index}] `,
                    key,
                    "\n",
                );
            });

            const keyNumber: number = parseInt(prompt("Choose a key: ") ?? "");
            const fromKey = wallet.keys[keyNumber];

            const amount = parseInt(prompt("Enter amount: ") ?? "");
            try {
                const transaction = wallet.createTransaction(
                    toAddress,
                    fromKey,
                    amount,
                    blockchain,
                );
                await Node.postTransactionToPeer(peer, transaction);
                console.log(transaction.toJson());
            } catch (e) {
                if (e instanceof Error) {
                    console.log("ERROR: ", e.message);
                }
                continue;
            }
        } else if (choice == "4") {
            const port = prompt("Enter peer port: ", "5801") ?? "5801"; 

            const blockchain = await Node.askForBlockchainFromPeer(
                "http://localhost:" + port,
            );

            if (!blockchain) {
                console.log("Couldn't download blockchain\n\n");
                continue;
            }

            wallet.keys.forEach((key) => {
                console.log(
                    "Public: ",
                    Wallet.getPublicKey(key),
                    "\nBalance: ",
                    blockchain.getBalance(Wallet.getPublicKey(key)),
                    "\n\n",
                );
            });
        } else if (choice == "Q" || choice == "q") {
            wallet.saveWallet();
            exit();
        }
    }
}
