const express = require("express");

const app = express();

app.get("/", (req, res) => {
    console.log(req.body)
    res.send("API is running");
});

app.listen(3000, () => {
    console.log("Server is running");
});