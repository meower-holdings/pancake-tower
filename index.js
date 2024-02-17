const express = require('express')
const mongoose = require("mongoose");
const {Services, Posts, makePost} = require("./schemas");
const bodyParser = require("body-parser");
const Parser = require('rss-parser');
const parser = new Parser();
const he = require('he');

require('dotenv').config()

const app = express()
const port = 6654
app.use(express.static('public'))
app.use(bodyParser.json())

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
        snippet: posts.filter(post => post.snippet)?.map(post => post.snippet).sort(() => Math.random() - 0.5).slice(0,9).join(" /// ") + " ///"
    });
})

app.post("/services/:id", async function(req, res) {
    console.log(req.body)
    if(!req.body.link) return res.status(400).send("A link is required");

    const service = await Services.findOne({name: req.params.id})
    if(!service) return res.status(404).send("Service not found");

    await makePost({
        type: req.params.id,
        link: req.body.link,
        snippet: req.body.snippet,
        duration: req.body.duration
    })

    return res.status(200).send("Post data captured :3")
})

async function checkFeeds() {
    const servicesWithRSS = await Services.find({rssFeed: { $ne: null }})
    servicesWithRSS.forEach(async service => {
        const feed = await parser.parseURL(service.rssFeed);

        const existingPosts = await Posts.find({link: {$in: feed.items.map(p => p.link)}})
        const nonexistingPosts = feed.items.filter(item => !existingPosts.some(post => post.link === item.link))

        console.log(existingPosts, nonexistingPosts)

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
    await mongoose.connect(process.env.MONGODB_URL);
    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })

    checkFeeds()
    setInterval(checkFeeds,10 * 60 * 1000);
} createServer();