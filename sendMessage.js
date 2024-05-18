const db = require("./DB");
// const { addMsgToQueue } = require("./msgQueue.service");
// const { isValidObjectId } = require("../functions/helper");
// /message/send
// מקבל user כטוקן
// מקבל מזהה קמפיין ומזהה הודעה
// שולף לידים ופרטים נחוצים לפי הקמפיין + פרטי הודעה לפי מזהה הודעה - ______
// מעביר לפונ' הזרקת משתנים דינאמיים - אריה
// שומר כל הודעה בטבלת "תור עבודה" לפי אלגוריתם של דיליי - מרים

async function sendMessage(data) {
  try {
    const { userId, campaignId, msgId, timeToSend } = data;

    let campaign = await db.campaign.readOne({ _id: campaignId, "msg._id": msgId });
    if (!campaign) throw { msg: "no messeges in this campaign", code: 404 };

    let msg = campaign.msg.find(m => m._id == msgId);

    let leadsNotRecieved = await getLeadsForSendMsg(campaign);

    let msgToSend = await injectionDataToMsg(leadsNotRecieved, msg.content, campaign.fields);
    let messagesToQueue = msgToSend.map((msg) => {
      return {
        msgId: msg.msgId,
        userId,
        leadId: msg.leadId,
        contentMsg: msg.content,
        timeToSend: timeToSend || Date.now(),
        campaignId,
      };
    });
    addMsgToQueue(messagesToQueue, userId);
  } catch (err) {
    console.log(err);
    return err;
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
  return leadsNotRecieved
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
  if (!fields.length) return leads.map(l => { return { leadId: l._id, msgContent } })


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

module.exports = { sendMessage, getDetailsToSend };

