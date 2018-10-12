const express = require("express");
const bodyParser = require("body-parser");
const app = express();

const station = require("./js/station.js");
const predict = station.predictDuration;

app.use(bodyParser.json());

app.use("/t/:gwei", (req, res) => {
    if (!req.params.gwei) {
        res.send("Howdy 🤠🛸");
    }
    console.log(req.params.gwei);
    let result = {
        bdata: station.bdata(),
        p: parseFloat(req.params.gwei),
        t: predict(parseFloat(req.params.gwei)),
    };
    res.json(result);
});

module.exports = app;
