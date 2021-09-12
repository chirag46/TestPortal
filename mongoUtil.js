const MongoClient = require( 'mongodb' ).MongoClient;

const url = "mongodb+srv://billingportal:billingportal@cluster0.u2dib.mongodb.net/BillingPortal";
const client = new MongoClient(url) // creating a bridge here  between the app and the db server

var _db;

module.exports = {

  connectToServer: function( callback) {

    return new Promise((res,rej)=>{
      client.connect().then(data=>{
        res("Connected");
        console.log("connected to db");
    })
    
    const dbName = 'BillingPortal'
    _db = client.db(dbName)

    })
    
   
  },

  disConnect:function(){

    return new Promise((res,rej)=>{

      client.close().then(data=>{
        res("disconnected")
      })

    })


  },

  getDb: function() {
    return _db;
  }
};