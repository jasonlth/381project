var express = require('express');
var app = express();
var session = require('cookie-session');
var bodyParser = require('body-parser');
var fs = require('fs');
var formidable = require('formidable');
var errormass = "";
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var mongourl = "mongodb://jasonlth:lthlth2403@ds151382.mlab.com:51382/jasonlth";

app.use(session({
  name: 'session',
  keys: ['this is secret','don not tell anyone']
}));

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

app.set('view engine', 'ejs');

app.get('/',function(req,res) {
	if(req.session.userID == null){
		res.redirect('/login');
	}else{
		res.redirect('/home');
	}
});

app.get("/login", function(req,res) {
	res.status(200).render("login",{c:errormass});
	errormass = "";
});

app.post("/login",function(req,res){
	if(req.body.userID == ""){
		errormass = "Incorrect User ID!";
		res.status(200).render("login",{c:errormass});
		errormass = "";
	}else{
		MongoClient.connect(mongourl,function(err,db) {
			try {
				assert.equal(err,null);
			} catch (err) {
				res.writeHead(500,{"Content-Type":"text/plain"});
				res.end("MongoClient connect() failed!");
			}
			var check = {};
			check['uid'] = req.body.userID;
			check['password'] = req.body.pw;
			findUser(db,check,function(temp){
				if(temp.length==0){
					errormass = "Incorrect User ID or Password!";
					res.redirect('/login');
				}else{
					req.session.userID = req.body.userID;
					res.redirect('/');
				}
			});
		});
	}
});

app.get("/createUser",function(req,res){
	res.status(200).render("createuser");
});

app.post("/createUser",function(req,res){
	MongoClient.connect(mongourl,function(err,db) {
		try {
			assert.equal(err,null);
		} catch (err) {
			res.writeHead(500,{"Content-Type":"text/plain"});
			res.end("MongoClient connect() failed!");
		}
		if(req.body.userID==""){
			res.redirect('/createUser');
		}else if(req.body.pw!=req.body.pw2){
			res.redirect('/createUser');
		}else{
			var check = {};
			check['uid'] = req.body.userID;
			findUser(db,check,function(temp){
				console.log(JSON.stringify(temp));
				if(temp.length==0){
					db.collection('user').insertOne({"uid":req.body.userID,"password":req.body.pw},function(err,result) {
						assert.equal(err,null);
						console.log("insert was successful!");
						console.log(JSON.stringify(result));
						db.close();
						res.redirect('/login');
					});
				}else{
					res.redirect('/createUser');
				}
			});
		}
	});
});

app.get("/logout",function(req,res){
	req.session.userID = null;
	res.redirect('/');
});

app.get("/home", function(req,res) {
	res.status(200).render("home");
});

app.get('/createRestaurant', function(req,res) {
	MongoClient.connect(mongourl,function(err,db) {
		try {
			assert.equal(err,null);
		} catch (err) {
			res.writeHead(500,{"Content-Type":"text/plain"});
			res.end("MongoClient connect() failed!");
		}
		var check = {};
		findRestaurant(db,check,function(temp){
			var number = temp.length + 1 ;
			res.status(200).render("createrestaurant",{c : req.session.userID,e : errormass,r : number});
			errormass = "";
		});
	});
});

app.post('/createRestaurant', function(req,res){
	var temp = {};
	var tempAdress = {};
	var form = new formidable.IncomingForm();
	form.parse(req, function (err, fields, files) {
		MongoClient.connect(mongourl,function(err,db) {
			try {
			  assert.equal(err,null);
			} catch (err) {
			  res.writeHead(500,{"Content-Type":"text/plain"});
			  res.end("MongoClient connect() failed!");
			}
			if(fields.name.length==0){
				errormass = "Restaurant name must have value!";
				db.close();
				res.redirect('/createRestaurant');
			}else{
				var filename=files.filebit.path;
				temp['rid'] = fields.rid;
				temp['name'] = fields.name;
				if(fields.borough!=""){
					temp['borough'] = fields.borough;
				}
				if(fields.cuisine!=""){
					temp['cuisine'] = fields.cuisine;
				}
				if(fields.street!=""){
					tempAdress['street']=fields.street;
				}
				if(fields.building!=""){
					tempAdress['building']=fields.building;
				}
				if(fields.zipcode!=""){
					tempAdress['zipcode']=fields.zipcode;
				}
				if(fields.lon!=""&&fields.lat!=""){
					tempAdress['coord']=[fields.lon,fields.lat];
				}
				if(Object.keys(tempAdress).length!=0){
					temp['address'] = tempAdress;
				}
				temp['grades'] = []
				fs.readFile(filename,function(err,data){
					var img = new Buffer(data).toString('base64');
					if(img.length !=0){
						temp['image'] = {'type':files.filebit.type,'bit':img};
					}
					temp['owner'] = fields.owner;
					insertRestaurant(db,temp,function(result) {
					  db.close();
					  errormass = "Create Susses";
					  res.redirect('/createRestaurant');
					});
				});
			}
		});
	});
});

app.get('/sreachRestaurant',function(req,res){
	var temp = [];
	res.status(200).render("sreachRestaurant",{'name':"",'borough':"",'cuisine':"",'rid':"",'restaurant':temp,'user': req.session.userID});
});

app.post('/sreachRestaurant',function(req,res){
	var rid = req.body.rid;
	var name = req.body.name;
	var borough = req.body.borough;
	var cuisine = req.body.cuisine;
	MongoClient.connect(mongourl,function(err,db) {
		try {
		  assert.equal(err,null);
		} catch (err) {
		  res.writeHead(500,{"Content-Type":"text/plain"});
		  res.end("MongoClient connect() failed!");
		}
		var criteria = {};
		if(name!=""){
			criteria['name']=name;
		}
		if(borough!=""){
			criteria['borough']=borough;
		}
		if(cuisine!=""){
			criteria['cuisine']=cuisine;
		}
		if(rid!=""){
			criteria['rid'] = rid;
		}
		findRestaurant(db,criteria,function(restaurant){
			db.close();
			res.status(200).render("sreachRestaurant",{'rid':rid,'name':name,'borough':borough,'cuisine':cuisine,'restaurant':restaurant,'user': req.session.userID});
		});
	});
});

app.post('/updateRestaurant',function(req,res){
	MongoClient.connect(mongourl,function(err,db) {
		try {
		  assert.equal(err,null);
		} catch (err) {
		  res.writeHead(500,{"Content-Type":"text/plain"});
		  res.end("MongoClient connect() failed!");
		}
		var criteria = {};
		criteria['rid'] = req.body.rid;
		findRestaurant(db,criteria,function(restaurant){
			db.close();
			res.status(200).render("updateRestaurant",{e:errormass,r:restaurant[0],g:JSON.stringify(restaurant[0].grades)});
		});
	});
});

app.post('/update',function(req,res){
	var temp = {};
	var tempAdress = {};
	var form = new formidable.IncomingForm();
	form.parse(req, function (err, fields, files) {
		MongoClient.connect(mongourl,function(err,db) {
			try {
			  assert.equal(err,null);
			} catch (err) {
			  res.writeHead(500,{"Content-Type":"text/plain"});
			  res.end("MongoClient connect() failed!");
			}
			if(fields.name.length==0){
				errormass = "Restaurant name must have value!";
				db.close();
				res.redirect('/home');
			}else{
				var check = {};
				check['rid'] = fields.rid;
				var filename=files.filebit.path;
				temp['grades'] = JSON.parse(fields.grade);
				temp['name'] = fields.name;
				temp['rid'] = fields.rid;
				if(fields.borough!=""){
					temp['borough'] = fields.borough;
				}
				if(fields.cuisine!=""){
					temp['cuisine'] = fields.cuisine;
				}
				if(fields.street!=""){
					tempAdress['street']=fields.street;
				}
				if(fields.building!=""){
					tempAdress['building']=fields.building;
				}
				if(fields.zipcode!=""){
					tempAdress['zipcode']=fields.zipcode;
				}
				if(fields.lon!=""&&fields.lat!=""){
					tempAdress['coord']=[fields.lon,fields.lat];
				}
				if(Object.keys(tempAdress).length!=0){
					temp['address'] = tempAdress;
				}
				fs.readFile(filename,function(err,data){
					var img = new Buffer(data).toString('base64');
					if(img.length !=0){
						temp['image'] = {'type':files.filebit.type,'bit':img};
					}else if(fields.bit!=""){
						temp['image'] = {'type':fields.type,'bit':fields.bit};
					}
					temp['owner'] = fields.owner;
					db.collection('restaurant').updateOne(check,temp,function(err,callback){
						if(err) throw err;
						console.log("updated");
						db.close();
						res.redirect('/home');;	
					});
				});
			}
		});
	});
});

app.post('/deleteRestaurant',function(req,res){
	MongoClient.connect(mongourl,function(err,db) {
		try {
		  assert.equal(err,null);
		} catch (err) {
		  res.writeHead(500,{"Content-Type":"text/plain"});
		  res.end("MongoClient connect() failed!");
		}
		var criteria = {};
		criteria['rid'] = req.body.rid;
		db.collection('restaurant').deleteOne(criteria,function(err,obj){
			if(err) throw err;
			console.log("Deleted");
			db.close();
			res.redirect('/home');
		});
	});
});

app.post('/grading',function(req,res){
	MongoClient.connect(mongourl,function(err,db) {
		try {
		  assert.equal(err,null);
		} catch (err) {
		  res.writeHead(500,{"Content-Type":"text/plain"});
		  res.end("MongoClient connect() failed!");
		}
		var userID = req.session.userID;
		var criteria = {};
		criteria['rid'] = req.body.rid;
		findRestaurant(db,criteria,function(temp){
			var temp2 = [];
			console.log(JSON.stringify(temp[0]));
			if(temp[0].grades!=undefined){
				temp2 = temp[0].grades;
			}
			temp2.push({'user':userID,'score':req.body.grade});
			temp[0].grades = temp2;
			db.collection('restaurant').updateOne(criteria,temp[0],function(err,callback){
				if(err) throw err;
				db.close();
				console.log("voted");
				res.redirect("/home");
			});
		});
	});
});

app.get('/api/restaurant/:type/:p',function(req,res){
	var type = req.params.type;
	var p = req.params.p;
	MongoClient.connect(mongourl,function(err,db) {
		try {
		  assert.equal(err,null);
		} catch (err) {
		  res.writeHead(500,{"Content-Type":"text/plain"});
		  res.end("MongoClient connect() failed!");
		}
		var criteria = {};
		criteria[type] = p;
		findRestaurant(db,criteria,function(temp){
			res.json(temp);
			db.close();
		});
	});
});

app.post('/api/restaurant',function(req,res){
	var temp = {};
	if(req.body.name==""){
		temp['status'] = "failed";
	}else if(req.body.owner==""){
		temp['status'] = "failed";
	}else{
		MongoClient.connect(mongourl,function(err,db) {
			try {
			  assert.equal(err,null);
			} catch (err) {
				temp['status'] = "failed";
			}
			var check = {};
			var temp2 = {};
			temp2 = req.body;
			findRestaurant(db,check,function(temp3){
				var number = temp3.length + 1 ;
				temp2['rid'] = ""+number;
				insertRestaurant(db,temp2,function(result){
					temp['status'] = "OK";
					findRestaurant(db,temp2,function(temp4){
						console.log(JSON.stringify(temp4));
						temp['_id'] = temp4[0]._id;
						db.close();
						res.json(temp);
					});
				});
			});
		});		
	}
});

function insertRestaurant(db,r,callback) {
	db.collection('restaurant').insertOne(r,function(err,result) {
		assert.equal(err,null);
		console.log("insert was successful!");
		console.log(JSON.stringify(result));
		callback(result);
	});
}

function findRestaurant(db,criteria,callback) {
	var restaurant = [];
	var temp = db.collection('restaurant').find(criteria);
	temp.each(function(err,doc) {
		assert.equal(err,null);
		if (doc != null) {
		  restaurant.push(doc);
		} else {
		  callback(restaurant);
		}
	  });
}

function findUser(db,criteria,callback){
	var temp =[];
	var temp2 = db.collection('user').find(criteria);
	temp2.each(function(err,doc) {
		assert.equal(err,null);
		if (doc != null) {
			temp.push(doc);
		}else{
			console.log(temp.length);
		  callback(temp);
		}
		});
}

app.listen(process.env.PORT || 8099);
