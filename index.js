const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const https = require("https");
const fs = require("fs");
require("dotenv").config();
const { connection } = require("./config/db");
const { userRoute } = require("./routes/userRoute");
const { bookingRoutes } = require("./routes/bookingRoute");

const app = express();

app.use(cors());
app.use(express.json());

const httpsServer = https.createServer(
    {
        key: fs.readFileSync("./key.pem"),
        cert: fs.readFileSync("./cert.pem"),
    },
    app
);

const io = new Server(httpsServer);

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/frontend/index.html");
});

app.use("/user", userRoute);
app.use("/booking", bookingRoutes);

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(express.static("frontend"));

io.on("connection", (socket) => {
    socket.on("joinRoom", (roomId, userId) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit("userConnected", userId);
        console.log(`User ${userId} joined room ${roomId}`);
        socket.on("disconnect", () => {
            socket.broadcast.to(roomId).emit("userDisconnected", userId);
        });
    });

    socket.on("message", (message) => {
        console.log(`Received : ${message}`);

        socket.broadcast.emit("message", message);
    });
});

app.get("/:room/:userId", (req, res) => {
    res.render("room", { roomId: req.params.room, userId: req.params.userId });
});

httpsServer.listen(process.env.port, async () => {
    try {
        await connection;
        console.log("Connected to DB");
        console.log(`Server is runnning at port ${process.env.port}`);
    } catch (error) {
        console.log("Not able to connect to DB");
        console.log(error);
    }
});
