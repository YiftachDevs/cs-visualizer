const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // Serve frontend files

io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("compile", (code, autoPlay) => {        
        const filePath = path.join(__dirname, "TempProgram.cs");

        // Save the C# code to a temporary file
        fs.writeFileSync(filePath, code);

        exec(`dotnet script "${filePath}"`, { cwd: "D:\\Dev\\Web\\C# Interpeter Visualizer\\cs-visual-interpeter" }, (error, stdout, stderr) => {
            if (error) {
                socket.emit("output", `Compilation Error:\n${stderr}`, autoPlay);
            } else {
                socket.emit("output", "Compilation successful!", autoPlay);
            }
        });
    });

    socket.on("disconnect", () => console.log("User disconnected"));
});

server.listen(3000, () => console.log("Server running at http://localhost:3000"));