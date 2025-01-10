import { parseArgs } from "jsr:@std/cli/parse-args";
import { Blockchain } from "./blockchain/blockchain.ts";
import { Node } from "./node/node.ts";

if (import.meta.main) {
  // TODO cleanup flags
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
  const node = new Node(
    host,
    port,
    blockchainPath,
    // TODO supply the reward address using flag/reading user input or something instead of this hardcode.
    "043252ac6149f3373bfe1f787b0b886919a7e9a038b53fc55c699d19993f4cfff23f405079e2261adea04742355315f85745cdf9466c7813f86d7c6740aca8e858",
  );

  
  // Connect to peers
  flags.join.forEach((peer) => {
    node.addPeer(peer, true);
  });
  
  if (flags.load) {
    const blockchainFile = `${blockchainPath}/blockchain.json`;
    node.blockchain = Blockchain.fromJson(Deno.readTextFileSync(blockchainFile));
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
