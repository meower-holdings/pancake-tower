const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
    name: String,
    display: String,
    url: String,
    rssFeed: String,
    authorized_ips: Array,
    useUsercount: Boolean
});
const Services = mongoose.model('Service', serviceSchema);

const postSchema = new mongoose.Schema({
    type: String,
    likedAt: Date,
    link: String,
    snippet: String,
    duration: Number
});
const Posts = mongoose.model('Post', postSchema);

async function makePost(data) {
    if(!data.type || !data.link) throw "Baka baka baka!";
    const post = new Posts({
        type: data.type,
        likedAt: data.likedAt || (new Date()).getTime(),
        link: data.link,
        snippet: data.snippet,
        duration: data.duration
    })
    await post.save()
}

module.exports = {Services, Posts, makePost}