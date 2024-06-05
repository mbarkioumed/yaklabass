const HTTPS_PORT = 8443;

require("dotenv").config();
const { error } = require("console");
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
const WebSocketServer = WebSocket.Server;

const app = express();

const rooms = new Map();

mongoose.connect(process.env.DB_URI);

const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to DB"));

const serverConfig = {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
};

function main() {
    const httpsServer = startHttpsServer(serverConfig);
    startWebSocketServer(httpsServer);
    printHelp();
}

// function startHttpsServer(serverConfig) {
//     app.use(express.urlencoded({ extended: true }));
//     app.use(express.json());

//     app.use(
//         session({
//             secret: "my secret key",
//             resave: false,
//             saveUninitialized: false,
//         })
//     );

//     app.use((req, res, next) => {
//         res.locals.message = req.session.message;
//         delete req.session.message;
//         next();
//     });

//     app.set("view engine", "ejs");

//     app.use("", require("./routes/routes"));

//     const httpsServer = https.createServer(serverConfig, app);
//     httpsServer.listen(HTTPS_PORT, "0.0.0.0");
//     return httpsServer;
// }

function startWebSocketServer(httpsServer) {
    // Create a server for handling websocket calls
    const wss = new WebSocketServer({ server: httpsServer });

    wss.on("connection", (ws) => {
        ws.on("message", (message) => {
            // Broadcast any received message to all clients
            const data = JSON.parse(message);

            if (data.roomcode) {
                console.log(`Received room code: ${data.roomcode}`);
                // Add the client to the room
                if (!rooms.has(data.roomcode)) {
                    rooms.set(data.roomcode, []);
                }
                rooms.get(data.roomcode).push(ws);
            } else {
                console.log(`received: ${message}`);
                // Broadcast the message to all clients in the same room
                const room = findRoom(ws);
                if (room) {
                    broadcast(room, message);
                }
            }
        });
    });
}

// function findRoom(ws) {
//     for (const [roomcode, clients] of rooms.entries()) {
//         if (clients.includes(ws)) {
//             return roomcode;
//         }
//     }
//     return null;
// }

// function broadcast(roomcode, data) {
//     const clients = rooms.get(roomcode);
//     if (clients) {
//         clients.forEach((client) => {
//             if (client.readyState === WebSocket.OPEN) {
//                 client.send(data, { binary: false });
//             }
//         });
//     }
// }

main();
