import { parseArgs } from "jsr:@std/cli/parse-args";
import { Node } from "./node.ts";
import { Message } from "./message.ts";

let node: Node;
// Entry point of the program
if (import.meta.main) {
  console.log(`%cWitaj w Górniczej Dolinie! ⛏`, "color: blue");

  const flags = parseArgs(Deno.args, {
    boolean: ["init"],
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

  // console.log(flags);

  const host: string = flags.host;
  const port: number = parseInt(flags.port);
  if (isNaN(port)) {
    console.error(`Invalid port value ${flags.port}`);
    Deno.exit(1);
  }
  node = new Node(host, port);
  flags.join.forEach((peer) => {
    node.addPeer(peer, true);
  });
  if (node.peers && node.peers.length > 0) {
    node.sayHi(node.peers[node.peers.length - 1]);
  }

  console.log(`%cEnter message or "exit" to quit.`, "color: gray");
  readInput().catch((err) => console.error(err));
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
      await node.broadcast(new Message(input));
    }
  }
}
