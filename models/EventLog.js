const mongoose = require("mongoose");

const EventLogSchema = new mongoose.Schema({

 event:{
   type:String,
   required:true
 },

 roomId:{
   type:String,
   required:true
 },

 userId:{
   type:String,
   required:true
 },

 username:{
   type:String,
   default:null
 },

 payload:{
   type:Object,
   default:{}
 },

 timestamp:{
   type:Date,
   default:Date.now
 }

});

module.exports = mongoose.model(
 "EventLog",
 EventLogSchema
);