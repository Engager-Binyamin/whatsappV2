const mongoose = require('mongoose');
const MONGO_URL = process.env.MONGO_URL

const data = {
    queue: require('./queue.model'),
    user: require('./user.model'),
}

function getFunctions(entity, { create, update, updateById, read, readOne, readLast, del }) {
    let f = {}
    if (create) f.create = async (data) => await data[entity].create(data)
    if (update) f.update = async (filter, newData) => await data[entity].updateOne(filter, newData)
    if (updateById) f.updateById = async (_id, newData) => await data[entity].updateOne({ _id }, newData)
    if (read) f.read = async (filter) => await data[entity].find(filter)
    if (readOne) f.readOne = async (filter) => await data[entity].findOne(filter)
    if (readLast) f.readLast = async (filter, sort) => await data[entity].findOne(filter).sort(sort).limit(1);
    if (del) f.del = async (_id) => await data[entity].findByIdAndDelete(_id).sort(sort).limit(1);
    return f
}



async function connect() {
    try {
        await mongoose.connect(MONGO_URL)
        console.log("DB - connection succeeded")

    } catch (error) {
        console.log("MongoDB Error: ", error);
    }
}

const db = {
    get user() {
        return getFunctions("user", { read: true, readOne: true })
    },
    get queue() {
        return getFunctions("queue", { read: true, readOne: true, create: true, del: true })
    },
    connect
}

module.exports = db;
