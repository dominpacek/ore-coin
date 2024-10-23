// Modified code from examples taken fron the Deno docs
// https://docs.deno.com/examples/http-server-websocket/
// https://docs.deno.com/examples/websocket/

function server() {
    Deno.serve({ port: 5801 }, (req) => {
        if (req.headers.get("upgrade") != "websocket") {
            return new Response(null, { status: 501 });
        }

        const { socket, response } = Deno.upgradeWebSocket(req);

        socket.addEventListener("open", () => {
            console.log("a client connected!");
        });

        socket.addEventListener("message", (event) => {
            console.log("socket event:", event);
            if (event.data === "ping") {
                socket.send("pong");
            }
        });

        return response;
    });
}

function send(socket: WebSocket, message: string) {
    console.log(`sending event: ${message}`);
    socket.send(message);
}

function client() {
    const socket = new WebSocket("ws://localhost:5801");
    console.log("Czekam na gotowość serwera...");
    socket.addEventListener("open", () => {
        console.log(socket.readyState);
        send(socket, "ping");
    });
    socket.addEventListener("message", (event) => {
        console.log(event.data);
    });
}

if (import.meta.main) {
    const init = confirm("Czy chcesz zainicjować kopalnię?");
    if (init) {
        server();
    } else {
        client();
    }
}
