const { MessageAck } = require("whatsapp-web.js");
const db = require("./DB");
// const { addMsgToQueue } = require("./msgQueue.service");
// const { isValidObjectId } = require("../functions/helper");
// /message/send
// מקבל user כטוקן
// מקבל מזהה קמפיין ומזהה הודעה
// שולף לידים ופרטים נחוצים לפי הקמפיין + פרטי הודעה לפי מזהה הודעה - ______
// מעביר לפונ' הזרקת משתנים דינאמיים - אריה
// שומר כל הודעה בטבלת "תור עבודה" לפי אלגוריתם של דיליי - מרים

const { intervals, clients, sockets } = require('./DB/localDB')

let msgSchedule = {};
let queue = {};

async function sendMessage(data) {
  try {
    const { user: { _id: userId }, campaignId, msgId, timeToSend = new Date() } = data;

    let campaign = await db.campaign.readOne({ _id: campaignId, "msg._id": msgId });
    if (!campaign) throw { msg: "no messeges in this campaign", code: 404 };

    let msgDB = campaign.msg.find(m => m._id == msgId);

    let leadsNotRecieved = await getLeadsForSendMsg(campaign);

    // Injecting dynamic fields into the message 
    let msgToSend = await injectionDataToMsg(leadsNotRecieved, msgDB.content, campaign.fields);

    // Add phone to Object
    msgToSend = msgToSend.map(m => { return { ...m, phone: campaign.leads.find(l => l._id == m.leadId)?.phone } })

    // Save queues in DB
    let newMsgsQueue = await addMsgToQueue(msgToSend, data);

    // Save queues in local objects
    if (!queue[userId]) queue[userId] = []
    queue[userId].push(...newMsgsQueue)

    startSendMessage(userId)

  } catch (err) {
    console.log(err);
    throw err;
  }
}

/**
 * Get all active leads that not recieved msg by msgId
 * @param {String} campaignId 
 * @param {String} msgId 
 * @returns {String[]} 
 */
async function getLeadsForSendMsg(campaign) {

  let leadsNotRecieved = {}
  let leadsRecieved = {}
  campaign.receivedMsgs.forEach(rc => leadsRecieved[rc.leadId] = rc);

  let leads = {}
  campaign.leads.forEach(l => {
    if (!l.isActive) return;

    leads[l._id] = l

    if (!leadsRecieved[l._id]) leadsNotRecieved[l._id] = l
  });
  return Object.keys(leadsNotRecieved)
}

async function injectionDataToMsg(leads = [], msgContent = "", fieldsDB) {
  let fields = [];
  for (i = 0; i < msgContent.length; i++) {
    if (msgContent[i] == "@") {
      let f = { field: "", s: i };
      while (msgContent[i] != " " && i < msgContent.length - 1) {
        f.field += msgContent[++i]
      }

      fields.push({ ...f, field: field.trim(), e: i })
    }
  }
  if (!fields.length) return leads.map(l => { return { leadId: l, msgContent } })


  fields.forEach(f => { fields[f] = { ...f, enField: fieldsDB.find(fdb => fdb.he == f.field)?.en } })

  return leads.map(l => {
    let fCnt = 0, newContent = "";
    for (i = 0; i < msgContent.length; i++) {
      let field = fields[fCnt];
      if (i != field?.s) newContent += msgContent[i]
      else {
        let prop = l[field.field] || f
        newContent += l[field.field] + " "
        i = field.e;
        fCnt++
      }
    }
    return { leadId: l._id, msgContent: newContent }
  });
}

async function addMsgToQueue(msgToSend, data) {
  const { user: { _id: userId }, campaignId, msgId, timeToSend = new Date() } = data;
  let arrMsg = msgToSend.map(msg => {
    return {
      userId,
      campaignId,
      msgId,
      leadId: msg.leadId,
      contentMsg: msg.msgContent,
      timeToSend,
      phone: msg.phone
    };
  });
  return await Promise.all(
    arrMsg.map(async ms => {
      let q = await db.queue.create(ms)
      ms.queue = q
      return ms
    }));
}

async function startSendMessage(userId) {
  if (!intervals[userId]) {
    intervals[userId] = setInterval(async () => {
      let msg = queue[userId][0]
      console.log(`Interval for ${userId}, send msg to lead : ${msg.leadId}`);
      let isSent = await sendMessageWhatsapp(msg)
      if (!isSent) return;
      // ###### שים לב #######
      // אם ההודעה לא נשלחה, היא לא מוסרת מרשימת ההמתנה בדאטהבייס, מתור העבודה
      // ובעוד 5 שניות - ינסו שוב לשלוח אותה. 
      // עדיף לבטל את ה-return אבל כן לטפל בדרך אחרת במה שלא נשלח
      // #####################
      await db.queue.del(msg.queue._id)
      queue[userId].shift();
      sendQueueSocket(userId, queue);
      if (queue[userId].length == 0) {
        clearInterval(intervals[userId]);
        return delete intervals[userId];
      }

    }, 5000);
  }
}

async function sendMessageWhatsapp(data) {
  let client = clients[data.userId];
  if (!client || !client.isReady) return false;

  try {
    const chatId = `972${Number(data.phone)}@c.us`;
    let messageId;
    let sentMessage;
    // Define the event listener functions and Add to the event
    const sendListener = async (msg) => {
      if (msg.id.fromMe && msg.to === chatId) {
        messageId = msg.id.id;
        sentMessage = msg;
        console.log(`Message with ID ${messageId} was sent to ${chatId}`);
      }
    };
    client.on("message_send", sendListener);

    const ackListener = async (msg, ack) => {
      console.log("MESSAGE SENT", "from:", msg.from, "to:", msg.to, "id:", msg.id.id, "ack:", msg.ack);

      const campaign = await db.campaign.readOne({ _id: data.campaignId });
      let received = campaign?.receivedMsgs?.find(re => re.leadId == data.leadId && re.msgId == messageId);
      if (!received) {
        campaign.receivedMsgs.push({
          leadId: data.leadId,
          msgId: messageId
        })
        await campaign.save();
        received = campaign?.receivedMsgs?.find(re => re.leadId == data.leadId && re.msgId == messageId);
      }

      let log = `Message with ID ${messageId} was `
      switch (ack) {
        case 1:
          log += "sent";
          received.status = "sent";
          received.sentData = Date.now();
          break;
        case 2:
          log += `received by ${chatId}`
          received.status = "received";
          break;
        case 3:
          log += `read by ${chatId}`
          received.status = 'read'
          break;
        default:
          console.log("ack isn't 1/2/3");
          break;
      }
      campaign.save()
      console.log(log);
    };
    client.on("message_ack", ackListener);

    sentMessage = await client.sendMessage(chatId, data.contentMsg);

    // #### אם קיים מדיה בהודעה #####
    let media = data.file && await MessageMedia.fromUrl(data.file);
    if (media) await client.sendMessage(chatId, media);

    // TODO: create receivedMsg in camp model


    // Remove the event listeners after sending the message
    client.off("message_send", sendListener);
    client.off("message_ack", ackListener);

    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
}

function sendQueueSocket(userId, queue) {
  sockets[userId] && sockets[userId].emit('queue', queue)
}

module.exports = { sendMessage };

