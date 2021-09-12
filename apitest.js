var express = require('express');
const { ensureAuthenticated } = require('./config/auth');
var router = express.Router();
let ejs = require("ejs");
let pdf = require("html-pdf");
let path = require("path")

/*
router.get("/getpdf/:id", async(req,res)=>{
    let db=req.db;
    console.log(req.params.id);
    let invoiceId=req.params.id
    let invoiceData;
if(invoiceId.includes("invoice"))
{
    invoiceData= await db.collection("invoices").find({invoice_id:req.params.id}).toArray()
}
else{
    invoiceData=await db.collection("invoices").find({invoice_id:`invoice${req.params.id}`}).toArray()

}
ejs.renderFile(path.join(__dirname, './views/', "invoicePdf.ejs"), {invoiceData:invoiceData[0]}, (err, data) => {
    if (err) {
          res.send(err);
    } else {
        let options = {
            "height": "18.25in",
            "width": "16.25in",
            "header": {
                "height": "20mm"
            },
            "footer": {
                "height": "20mm",
            },
        };
        pdf.create(data, options).toStream(function (err,stream) {
            stream.pipe(res);
          })
    }
});
})
*/

router.get("/", async(req,res)=>{
	const db=req.db;
    var options = {
        allowDiskUse: false
    };
    const  pipeline = [
        {
            "$lookup": {
                "from": "broadband",
                "localField": "company_id",
                "foreignField": "company_id",
                "as": "broadbandData"
            }
        },
        {   $unwind:"$broadbandData" }, 
        {
            "$lookup": {
                "from": "customer",
                "localField": "company_id",
                "foreignField": "company_id",
                "as": "customerData"
            },
        },

        {   $unwind:"$customerData" },   


    ];

    //like 5cents for each SMS
    //like 20cents per minute
    //like 10cents for each MB data consumed
    
    var dataCombined =await  db.collection("mobile").aggregate(pipeline, options).toArray();
    let priceArray=dataCombined.reduce((acc,ele)=>{
    let price=((5*ele.sms) +(20*ele.call_duration)+(10*ele.data_consumption)+(10*ele.broadbandData.data_consumption))
    
      ele.price=Math.round(price/100)+155;;
       acc.push({companyName:ele.customerData.company_name,price:ele.price})
       return acc;

    },[])

    priceArray.sort((a,b)=>{
       return a.price>b.price ?-1 :a.price==b.price?0:1;
    })
    let slicedArray=priceArray.slice(0,100);
	//console.log({priceArray:slicedArray});
	
    const  pipeline1 = [
        {
            "$lookup": {
                "from": "status",
                "localField": "company_id",
                "foreignField": "company_id",
                "as": "statusData"
            }
        },
        {   $unwind:"$statusData" }, 

        {
            $match:{
               "statusData.payment_status":{$eq:"unpaid"}
      
            }
        }
      
 ];

 var dataCombined1 =await  db.collection("customer").aggregate(pipeline1, options).toArray();
 const dataCombinedSliced=dataCombined1.slice(0,100);
res.json({priceArray:slicedArray,unpaidUsers:dataCombinedSliced});	
})

// Search Api
router.post("/searchBar",  async(req,res)=>{
    
    const body=req.body.state;

    const db=req.db;
    if(body.trim().length>0)
    {
        const matchWord=body.split(":");
        const queryWord=matchWord[1];
    
        switch (matchWord[0]) {
            case "customer":
                
              let data=await db.collection("customer").find({company_name:new RegExp(queryWord, 'i')}).toArray()
    
              res.json({customer:data,message:"Success",invoice:[],bills:[]})
               break;
             
            case "invoice":
                let invoiceData=await db.collection("invoices").find({invoice_id:new RegExp(queryWord, 'i')}).toArray()
                //console.log(invoiceData);
    
                res.json({customer:[],message:"Success",invoice:invoiceData,bills:[]})
                
                    break;
    
            case "bills":
    
                //console.log("bills");

                var options = {
                    allowDiskUse: false
                };
                const  pipeline = [

                    {
                        "$match":{"company_id":parseFloat(queryWord)}

                    },
                    
                    {
                        "$lookup": {
                            "from": "broadband",
                            "localField": "company_id",
                            "foreignField": "company_id",
                            "as": "broadbandData"
                        }
                    },
                    {   $unwind:"$broadbandData" }, 
                    {
                        "$lookup": {
                            "from": "customer",
                            "localField": "company_id",
                            "foreignField": "company_id",
                            "as": "customerData"
                        },
                    },
            
                    {   $unwind:"$customerData" },   
            
            
                ];
            
                const dataCombined =await  db.collection("customer").aggregate(pipeline, options).toArray();
    
                res.json({customer:[],message:"Success",invoice:[],bills:dataCombined})
                
                break;      
        
            default:
                return res.json({customer:[],message:"No Data Found",invoice:[],bills:[]})
    }
           
    }
    else{

        res.json([]);
    }

})

/// Api to get the bill
router.get("/getBill/:id",  async(req,res)=>{
    const db=req.db; 
	var options = {
        allowDiskUse: false
    };
    const  pipeline = [

        {
            "$match":{"company_id":parseFloat(req.params.id)}

        },
        {

            "$lookup": {
                "from": "broadband",
                "localField": "company_id",
                "foreignField": "company_id",
                "as": "broadbandData"
            }
        },
        {   $unwind:"$broadbandData" }, 
        {
            "$lookup": {
                "from": "customer",
                "localField": "company_id",
                "foreignField": "company_id",
                "as": "customerData"
            },
        },

        {   $unwind:"$customerData" },   


    ];
    
    //price calculates the charges for the data consumed in mobile without the fixed charges
    var dataCombinedMobile =await  db.collection("mobile").aggregate(pipeline, options).toArray();
    let mobileArray=dataCombinedMobile.reduce((acc,ele)=>{
    let price=((5*ele.sms) +(20*ele.call_duration)+(10*ele.data_consumption)+(10*ele.broadbandData.data_consumption))
    ele.totalPrice=Math.round(price/100)+155;

        ele.mobilePrice=(((5*ele.sms) +(20*ele.call_duration) + (10*ele.data_consumption))/100)
        ele.mobileTotal=Math.round(ele.mobilePrice)+50;

        ele.broadbandDataConsumption=ele.broadbandData.data_consumption;
        let price1=(10*ele.broadbandData.data_consumption)
        ele.broadBandPrice=(price1/100);
        ele.bbTotal=Math.round(ele.broadBandPrice)+105;

        acc.push(ele);
        return acc;
    },[])

    var dataCombinedCust =await  db.collection("customer").aggregate(pipeline, options).toArray();
    let customerName=dataCombinedCust.reduce((acc,ele)=>{(ele.customerData.company_name)
       acc.push(ele)
       return acc;

    },[])
    
    res.json({mobileArray:mobileArray[0],customerName:customerName});
})

//dynmaically generate an invoice  based on the company id passed

router.get("/generateInvoice/:id", async(req,res)=>{
    const db=req.db; //

    // checking if invoice already exists
    const checkIFInvoiceGenerated=await db.collection("invoices").find({company_id:parseInt(req.params.id)}).toArray();
    if (checkIFInvoiceGenerated.length>0) return res.json({status:"Success",message:"Invoice  Already Generated",invoice:checkIFInvoiceGenerated})
    else{
    var options = {
        allowDiskUse: false
    };
    const  pipeline = [

        {
            "$match":{"company_id":parseFloat(req.params.id)}

        },
        {

            "$lookup": {
                "from": "broadband",
                "localField": "company_id",
                "foreignField": "company_id",
                "as": "broadbandData"
            }
        },
        {   $unwind:"$broadbandData" }, 
        {
            "$lookup": {
                "from": "customer",
                "localField": "company_id",
                "foreignField": "company_id",
                "as": "customerData"
            },
        },

        {   $unwind:"$customerData" },   


    ];

    //like 5cents for each SMS
    //like 20cents per minute
    // like 10cents for each MB data consumed
    
    var dataCombined =await  db.collection("mobile").aggregate(pipeline, options).toArray();
    let priceArray=dataCombined.reduce((acc,ele)=>{
    let price=((5*ele.sms) +(20*ele.call_duration)+(10*ele.data_consumption)+(10*ele.broadbandData.data_consumption))
    ele.totalPrice=Math.round(price/100)+155;

    ele.mobilePrice=(((5*ele.sms) +(20*ele.call_duration) + (10*ele.data_consumption))/100);
    ele.mobileTotal=Math.round(ele.mobilePrice)+50;
    ele.broadbandDataConsumption=ele.broadbandData.data_consumption;

    let price1=(10*ele.broadbandData.data_consumption)
    ele.broadBandPrice=(price1/100);
    ele.bbTotal=Math.round(ele.broadBandPrice)+105;
    acc.push(ele)
     return acc;

    },[])
 
//Inserting the bill in the invoice collection 
let _dataCombined=dataCombined[0];
delete _dataCombined._id

db.collection("invoices").insertOne({...dataCombined[0],invoice_id:`invoice${req.params.id}`}).then(data=>{
    res.json({status:"Success",message:"Invoice Generated"})
})
}
})

router.get("/getInvoice/:id",  async(req,res)=>{
    let db=req.db;
    console.log(req.params.id);
    let invoiceId=req.params.id
    let invoiceData;
if(invoiceId.includes("invoice"))
{
    invoiceData= await db.collection("invoices").find({invoice_id:req.params.id}).toArray()

}
else{
    invoiceData=await db.collection("invoices").find({invoice_id:`invoice${req.params.id}`}).toArray()

}
    console.log(invoiceData);
    res.json({invoiceData:invoiceData[0]});
})

//charts api

router.get("/charts",  async(req,res)=>{
    const db=req.db; 
    const status = db.collection("status");

    //chart1
    // Estimate the total number of documents in the collection
    // and print out the count.
    const estimate = await status.estimatedDocumentCount();
    const unpaid = { payment_status: "unpaid" };
    const paid = { payment_status: "paid" };
    
    const countUnpaid = await status.countDocuments(unpaid);
    const countPaid = await status.countDocuments(paid);

    const perPaid= (countPaid/estimate)*100;
    const perUnpaid= (countUnpaid/estimate)*100;

    //chart2
    //Broadband data consumption vs comapny ID
    var options = {
        allowDiskUse: false
    };
    const  pipeline = [
        {
            "$lookup": {
                "from": "broadband",
                "localField": "company_id",
                "foreignField": "company_id",
                "as": "broadbandData"
            }
        },
        {   $unwind:"$broadbandData" }, 
        {
            "$lookup": {
                "from": "customer",
                "localField": "company_id",
                "foreignField": "company_id",
                "as": "customerData"
            },
        },

        {   $unwind:"$customerData" },   


    ];
    var dataCombined =await  db.collection("mobile").aggregate(pipeline, options).toArray();
    let priceArray=dataCombined.reduce((acc,ele)=>{
    let price=(10*ele.broadbandData.data_consumption);
    ele.price=(price/100)+155+105;
    acc.push({companyID:ele.customerData.company_id,price:ele.price})
    return acc;

    },[])

    priceArray.sort((a,b)=>{
       return a.price>b.price ?-1 :a.price==b.price?0:1;
    })
    let slicedArray=priceArray.slice(0,10)
	//console.log({priceArray:slicedArray});

    //chart3
    let priceArrayMobile=dataCombined.reduce((acc,ele)=>{
    let priceMobile=(5*ele.sms) +(20*ele.call_duration)+(10*ele.data_consumption);
    ele.priceMobile=(priceMobile/100)+155+50;
    acc.push({priceMobile:ele.priceMobile})
    return acc;
    },[])
    priceArrayMobile.sort((a,b)=>{
        return a.price>b.price ?-1 :a.price==b.price?0:1;
    })
    let slicedArrayMobile=priceArrayMobile.slice(0,10)
    //console.log({priceArrayMobile:slicedArrayMobile});

    //chart4
    const mobileTypes = db.collection("mobile");
    const total = await mobileTypes.estimatedDocumentCount();
    
    const iphone = { mobile_type:"Iphone" };
    const samsung = { mobile_type: "Samsung" };
    const nokia = { mobile_type: "Nokia" };
    
    const countIphone = await mobileTypes.countDocuments(iphone);
    const countSamsung = await mobileTypes.countDocuments(samsung);
    const countNokia = await mobileTypes.countDocuments(nokia);

    const iphonePer= (countIphone/total)*100;
    const samsungPer= (countSamsung/total)*100;
    const nokiaPer= (countNokia/total)*100;
    //console.log(iphonePer,samsungPer,nokiaPer);

    res.json({perPaid:perPaid,perUnpaid:perUnpaid,
                               priceArray:slicedArray,priceArrayMobile:slicedArrayMobile,
                               iphonePer:iphonePer,samsungPer:samsungPer,nokiaPer:nokiaPer});
})

// router.get("/profile/:email",(req,res)=>{
//     const db=req.db; 
// 	var options = {
//         allowDiskUse: false
//     };
//     const  pipelineEmp = [

//         {
//             "$match":{"email":parseFloat(req.params.email)}

//         },
//         {

//             "$lookup": {
//                 "from": "OauthUsers",
//                 "localField": "email",
//                 "foreignField": "email",
//                 "as": "EmpInfo"
//             }
//         },
//         {   $unwind:"$EmpInfo" }, 
//     ];
    
//     let empData=pipelineEmp.toArray();
//     console.log(empData);
//     res.render("./profile.ejs",{empData:empData});
//     res.render("./profile.ejs");
// })


router.get("/searchbar",(req,res)=>{
    res.render("index");
})

module.exports = router;
