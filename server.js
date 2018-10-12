const app = require("./index");
const server = require("http").Server(app);
const cors = require("cors");

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept",
    );
    next();
});

server.keepAliveTimeout = 60000 * 2;

server.listen(3000, () => {
    console.log("The server is running: http://localhost:" + 3000);
});
