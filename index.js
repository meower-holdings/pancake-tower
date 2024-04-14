const express = require('express')
const mongoose = require("mongoose");
const {Services, Posts, makePost} = require("./schemas");
const bodyParser = require("body-parser");
const Parser = require('rss-parser');
const parser = new Parser();
const he = require('he');
const ws = require('ws');

const app = express()
const port = 6654
const wss = new ws.Server({ port: 6655 });
app.use(express.static('public'))
app.use(bodyParser.json())

require('dotenv').config();

wss.on('connection', (ws) => {
    ws.send("mrrrrp hewwo ^_^ youre cute")
})

app.get("/services", async function(req, res) {
    const services = await Services.find({$or: [{authorized_ips: req.ip}, {authorized_ips: null}]}).select('-authorized_ips').select('-_id')
    return res.json(services);
})

app.get("/services/:id", async function(req, res) {
    const service = await Services.findOne({name: req.params.id})
    if(!service) return res.status(404).send("Service not found");

    if(!req.query.timestamp) return res.status(400).send("A timestamp is required");

    const posts = await Posts.find({type: req.params.id, likedAt: {$gt: parseInt(req.query.timestamp)}})

    return res.json({
        count: posts.length,
        snippet: posts.filter(post => post.snippet).sort((a, b) => {return new Date(b.likedAt) - new Date(a.likedAt);}).map(post => post.snippet).slice(0,99).join(" /// ") + " ///"
    });
})

app.post("/services/:id", async function(req, res) {
    console.log(req.body)
    if(!req.body.link) return res.status(400).send("A link is required");

    const service = await Services.findOne({name: req.params.id})
    if(!service) return res.status(404).send("Service not found");
    const post = await Posts.findOne({type: req.params.id, link: req.body.link})
    if(post) return res.status(409).send("This post has already been submitted");

    await makePost({
        type: req.params.id,
        likedAt: req.body.likedAt,
        link: req.body.link,
        snippet: req.body.snippet,
        duration: req.body.duration
    })

    res.status(200).send("Post data captured :3")

    wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify({type: req.params.id, link: req.body.link, snippet: req.body.snippet}));
        }
    });
})

app.get("/services/:id/usercount", async function(req, res) {
    const service = await Services.findOne({name: req.params.id})
    if (!service) return res.status(404).send("Service not found");

    const posts = await Posts.find({type: req.params.id, likedAt: {$gt: parseInt(req.query.timestamp) || 1}})

    let userCounts = {}
    posts.forEach(function(post){
        let username = new URL(post.link).pathname.split("/")[1];

        userCounts[username] = userCounts[username] + 1 || 1;
    })

    return res.json(Object.fromEntries(Object.entries(userCounts).sort((a, b) => b[1] - a[1])))
})

async function checkFeeds() {
    const servicesWithRSS = await Services.find({rssFeed: { $ne: null }})
    servicesWithRSS.forEach(async service => {
        const feed = await parser.parseURL(service.rssFeed);

        const existingPosts = await Posts.find({link: {$in: feed.items.map(p => p.link)}})
        const nonexistingPosts = feed.items.filter(item => !existingPosts.find(post => item.link === post.link))

        nonexistingPosts.forEach(async post => {
            if(service.name === "tumblr" && post.title === "Photo") post.title = undefined;
            if(post.title) post.title = he.decode(post.title);

            await makePost({
                type: service.name,
                link: post.link,
                snippet: post.title,
                likedAt: (new Date(post.isoDate).getTime())
            })
        })
    })
}

async function createServer() {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URL);
    app.listen(port, () => {
        console.log(`Pancake Tower on ${port}`)
        console.log("Websocket on 6655")
    })

    checkFeeds()
    setInterval(checkFeeds,10 * 60 * 1000);
} createServer();