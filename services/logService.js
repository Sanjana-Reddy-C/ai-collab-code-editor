const CodeLog = require("../models/CodeLog");
const EventLog = require("../models/EventLog");
const Session = require("../models/Session");


// =========================
// SAVE CODE CHANGES
// =========================
const saveCodeChange = async (data) => {
 try{

   await CodeLog.create({
      roomId: data.roomId,
      userId: data.userId,
      code: data.code,
      lineNumber: data.lineNumber || null,
      changeType: data.changeType || "edit"
   });

 }catch(err){
   console.log("Code log error:", err.message);
 }
};


// =========================
// SAVE EVENTS
// =========================
const logEvent = async (data) => {
 try{

   await EventLog.create({
      event: data.event,
      roomId: data.roomId,
      userId: data.userId,
      username: data.username,
      payload: data.payload || {}
   });

 }catch(err){
   console.log("Event log error:", err.message);
 }
};


// =========================
// START SESSION
// =========================
const startSession = async (roomId, userId) => {
 try{

   let session = await Session.findOne({
      roomId,
      endTime: null
   });

   // create new active session
   if(!session){

      session = await Session.create({
         roomId,
         users: [userId]
      });

   }

   // add user if not already in session
   else if(!session.users.includes(userId)){

      session.users.push(userId);
      await session.save();

   }

   console.log("Session started:", roomId, userId);

 }catch(err){
   console.log("Session start error:", err.message);
 }
};



// =========================
// END SESSION
// =========================
const endSession = async (roomId) => {
 try{

   await Session.findOneAndUpdate(
      {
         roomId,
         endTime: null
      },
      {
         endTime: new Date()
      }
   );

   console.log("Session ended:", roomId);

 }catch(err){
   console.log("Session end error:", err.message);
 }
};



module.exports = {
 saveCodeChange,
 logEvent,
 startSession,
 endSession
};