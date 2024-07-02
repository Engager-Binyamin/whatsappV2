const mongoose = require("mongoose");

const receivedMsg = new mongoose.Schema({
  leadId: {
    type: mongoose.SchemaTypes.ObjectId
  },
  msgId: {
    type: mongoose.SchemaTypes.ObjectId
  },
  status: {
    type: String,
    enum: ["created", "sent", "received","read"],
    default: "created",

  },
  sentDate: {
    type: Date,
    default: Date.now
  }

})
const leadSchema = new mongoose.Schema({
  fullName: {
    type: String,
  },
  // fName: {
  //   type: String,
  // },
  // lName: {
  //   type: String,
  // },
  email: {
    type: String,
    default: ''
    // ???OK
  },
  phone: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
    default: ''
  },
  joinDate: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  extra: {
    type: mongoose.SchemaTypes.Mixed
  }

});
const msgSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  creationDate: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // TODO: check if this property needs to be removed
  status: {
    type: String,
    enum: ["created", "sent", "received"],
    default: "created",
  },
  isZeroMsg: {
    type: Boolean
  }

});

const campaignSchema = new mongoose.Schema({
  user: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'user',
    default: "65ba97e536d6af41e9beb0d1",
  },
  title: {
    type: String,
    required: true,
  },
  details: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  img: {
    type: String,
  },
  webhook: {
    type: String,
  },
  fields: {
    type: [{ en: String, he: String }],
    default: [
      { en: 'fullName', he: 'שם' },
      { en: 'email', he: 'אימייל' },
      { en: 'phone', he: 'טלפון' },
      { en: 'notes', he: 'הערות' },
      { en: 'joinDate', he: 'הצטרפות' }]
  },
  msg: [msgSchema],
  leads: [leadSchema],
  receivedMsgs: [receivedMsg],



});

const campaignModel = mongoose.model("campaign", campaignSchema);
module.exports = campaignModel;

