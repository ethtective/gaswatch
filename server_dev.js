const app = require("./index");
const server = require("http").Server(app);

server.listen(3000, () => {
    console.log("The server is running: http://localhost:3000");
});
