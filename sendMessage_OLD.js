

// TODO: change and test
async function createNewQueue(userId) {
  try {
    let msgs;
    // if (!queue[userId]) queue[userId] = [];
    // if (!msgSchedule[userId]) msgSchedule[userId] = [];
    queue[userId] = []
    msgSchedule[userId] = []
    msgs = await msgQueueController.read({ userId: userId });
    msgs.forEach((ms) => {
      checkTimeMsg(ms, userId);
    });
  } catch (error) {
    console.log(error);
  }
}

function checkTimeMsg(msg, userId) {
  try {
    let now = new Date().getTime();
    if (msg.timeToSend <= now) {
      if (queue[userId]?.length > 0) {
        queue[userId]?.push(msg);
      } else {
        queue[userId]?.push(msg);
        sendQueue(userId);
      }
    } else {
      if (msgSchedule[userId]?.length > 0) {
        msgSchedule[userId]?.push(msg);
      } else {
        msgSchedule[userId]?.push(msg);
        schedule(userId);
      }
    }
    sendDataInSocket(userId)
  } catch (error) {
    console.log(error);
  }
}

// שולח את התור
async function sendQueue(userId) {
  try {
    if (queue[userId]?.length > 0) {
      await createReceideMsg(userId);
      sentOneMsg(queue[userId][0]);
      setTimeout(async () => {
        // await msgQueueController.del(queue[userId][0]._id);
        queue[userId].shift();
        sendDataInSocket(userId)
        sendQueue(userId);
      }, 6000);
    } else {
      return;
    }
  } catch (error) {
    console.log(error);
  }
}

// עדכון בDB מרכזי
async function createReceideMsg(userId) {
  let msg = queue[userId][0];
  let data = {
    leadId: msg.leadId,
    msgId: msg.msgId,
  };
  let campaign = await campaignController.readOne({ _id: msg.campaignId })
  let isExits = campaign.receivedMsgs.find(re => {
    return String(re.leadId) == String(msg.leadId) &&
      String(re.msgId) == String(msg.msgId)
  })
  if (!isExits) {
    return await campaignController.updateOne(
      { _id: msg.campaignId },
      { $push: { receivedMsgs: data } }
    );
  }
}
async function sentOneMsg(data) {
  try {
    const campaign = await campaignController.readOne({ _id: data.campaignId });
    if (!campaign) throw "ajs";
    const lead = campaign.leads.find(
      (le) => String(le._id) === String(data.leadId)
    );
    if (!lead) throw "asfd";
    const received = campaign.receivedMsgs.find(
      (re) =>
        String(re.msgId) === String(data.msgId) &&
        String(re.leadId) === String(data.leadId)
    );
    if (!received) throw "asfd";
    const newData = {
      leadId: data.leadId,
      msg: data.contentMsg,
      userID: data.userId,
      phone: lead.phone.replace("0", "", 1),
      receivedId: received._id,
    };
    sendNewMessage(newData);
  } catch (err) {
    console.log(err);
  }
}

// מנהל תזמון - כשמגיע התזמון - מכניס את ההודעה לתור
async function schedule(userId) {
  try {
    msgScheduleByUser = msgSchedule[userId]?.sort((a, b) => a.timeToSend - b.timeToSend);
    if (msgSchedule[userId]?.length > 0) {
      let now = new Date().getTime();
      let timeAwait = msgSchedule[userId][0].timeToSend - now;
      // אם במקרה הזמן כבר עבר - הוא יוסיף אותו ישר לתחילת התור.
      setTimeout(() => {
        if (queue[userId]?.length > 0) {
          queue[userId]?.unshift(msgSchedule[0]);
        } else {
          queue[userId]?.unshift(msgSchedule[0]);
          sendQueue(userId);
        }
        msgSchedule[userId]?.shift();
        sendDataInSocket(userId)

      }, timeAwait);
    } else {
    }
  } catch (error) {
    console.log(error);
  }
}
async function sendDataInSocket(userId) {
  try {
    const funcUpdateData = async (ms) => {
      let obj = { fullNameLead: '', nameCampaign: '', dateToSend: '' }
      let campaign = await campaignController.read({ _id: ms.campaignId })
      if (!campaign) throw 'campaign not exist'
      let lead = campaign[0].leads.find(l => String(l._id) == String(ms.leadId))
      if (!lead) throw 'lead not exist'
      obj.fullNameLead = lead.fullName
      obj.nameCampaign = campaign[0]['title']
      obj.dateToSend = ms.timeToSend
      return obj
    }

    const queuePromises = queue[userId].map(ms => funcUpdateData(ms))
    const schedulePromises = msgSchedule[userId].map(ms => funcUpdateData(ms))

    const queueMe = await Promise.all(queuePromises)
    const scheduleMe = await Promise.all(schedulePromises)
    const dataToClient = { b: queueMe, a: scheduleMe }
    sockets[userId].emit('queue', dataToClient)

  } catch (error) {
    console.log(error);
  }

}

