const mongoose = require("mongoose");
const msgQueueSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Types.ObjectId,
        required: true
    },
    campaignId:{
        type: mongoose.Types.ObjectId,
        required: true
    },
    contentMsg:{
        type: String,
        required: true
    },
    timeToSend:{
        type: Number,
        required: true
    },
    leadId:{
        type: mongoose.Types.ObjectId,
        required: true
    },
    msgId:{
        type: mongoose.Types.ObjectId,
        required: true
    }
    // status:{
    //     type: String,
    //     enum: ['isActive', 'isAwait', 'isTiming', 'isFinish']
    // }
});
const msgQueueModel = mongoose.model("msgQueue", msgQueueSchema);
module.exports = msgQueueModel;