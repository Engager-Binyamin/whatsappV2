const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("./DB");
const { generateQR ,getSession} = require('./socket')

const authToken = async (req, res, next) => {
    try {
        const originalToken = req.headers.authorization;
        if (!originalToken) throw "Unauthorized";

        const token = originalToken.replace("Bearer ", "");

        const payload = jwt.verify(token, process.env.SECRET);
        const user = await db.user.readOne({ phone: payload.phone })
        if (!user) throw { msg: "not permitted" }
        // const user = {
        //     _id: "65ed9c525b51ed6b4bd16107"
        // }
        req.body.user = user
        next()
    } catch (err) {
        res.status(401).send("Unauthorized")
    }
}

router.get("/queue", authToken, async (req, res) => {
    try {
        let result = await db.queue.read()
        res.send(result)
    }
    catch (err) {
        res.status(400).send(err);
    }
});

router.get("/session", authToken, async (req, res) => {
    try {
        let r = await getSession(req.body.user._id)
        res.send(r)
    }
    catch (err) {
        res.status(400).send(err);
    }
});

module.exports = router;