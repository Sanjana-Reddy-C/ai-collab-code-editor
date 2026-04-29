const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({

 roomId:{
   type:String,
   required:true
 },

 users:[
   {
     type:String
   }
 ],

 startTime:{
   type:Date,
   default:Date.now
 },

 endTime:{
   type:Date,
   default:null
 },

 status:{
   type:String,
   default:"active"
 }

});

module.exports = mongoose.model("Session",SessionSchema);