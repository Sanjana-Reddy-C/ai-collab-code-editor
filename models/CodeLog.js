const mongoose = require("mongoose");

const CodeLogSchema = new mongoose.Schema({
 roomId:{
   type:String,
   required:true
 },

 userId:{
   type:String,
   required:true
 },

 code:{
   type:String,
   required:true
 },

 lineNumber:{
   type:Number,
   default:null
 },

 changeType:{
  type:String,
  default:"edit"
},

changeSize:{
  type:Number,
  default:0
},

 timestamp:{
   type:Date,
   default:Date.now
 }

});

module.exports =
mongoose.model("CodeLog",CodeLogSchema);