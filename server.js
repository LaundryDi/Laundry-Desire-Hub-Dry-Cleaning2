const express=require('express');const fs=require('fs');const path=require('path');
const app=express();const PORT=process.env.PORT||3000;const DATA=path.join(__dirname,'data.json');
app.use(express.json());app.use(express.static(path.join(__dirname,'public')));
function load(){try{return JSON.parse(fs.readFileSync(DATA,'utf8'))}catch{return {orders:[]}}}function save(d){fs.writeFileSync(DATA,JSON.stringify(d,null,2))}
const prices={washFold:{minKg:4,minPrice:269,perKg:69},washIron:{minKg:4,minPrice:369,perKg:95}};
app.get('/api/prices',(req,res)=>res.json(prices));
app.post('/api/orders',(req,res)=>{const d=load(),o=req.body;if(!o.customerName||!o.mobile||!o.items?.length)return res.status(400).json({error:'Customer details and at least one item are required.'});o.id='LDH-'+Date.now().toString().slice(-7);o.createdAt=new Date().toISOString();o.status='Received';o.ready=false;d.orders.unshift(o);save(d);res.json(o)});
app.post('/api/customer/orders',(req,res)=>{const d=load();res.json(d.orders.filter(o=>o.mobile===req.body.mobile).slice(0,20))});
app.post('/api/admin/login',(req,res)=>{if(req.body.username==='Laundry'&&req.body.password==='4321')res.json({ok:true});else res.status(401).json({error:'Invalid admin login'})});
app.get('/api/admin/orders',(req,res)=>res.json(load().orders));
app.patch('/api/admin/orders/:id',(req,res)=>{const d=load(),o=d.orders.find(x=>x.id===req.params.id);if(!o)return res.status(404).json({error:'Order not found'});Object.assign(o,req.body);save(d);res.json(o)});
app.listen(PORT,()=>console.log(`Laundry Desire Hub running on http://localhost:${PORT}`));
