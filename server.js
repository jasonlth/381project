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
		req.session.userID = req.body.userID;
		res.redirect('/');
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
		if(req.body.name==""){
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
	res.status(200).render("createrestaurant",{c : req.session.userID,e : errormass});
	errormass = "";
});

app.post('/createRestaurant', function(req,res){
	var temp = {};
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
				temp['name'] = fields.name;
				temp['borough'] = fields.borough;
				temp['cuisine'] = fields.cuisine;
				temp['address'] = {'street':fields.street,'building':fields.building,'zipcode':fields.zipcode,'coord':[fields.lon,fields.lat]};
				fs.readFile(filename,function(err,data){
					var img = new Buffer(data).toString('base64');
					temp['image'] = {'type':files.filebit.type,'bit':img};
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
	res.status(200).render("sreachRestaurant",{'name':"",'borough':"",'cuisine':"",'street':"",'building':"",'zipcode':"",'lon':"",'lat':"",'restaurant':temp,'user': req.session.userID});
});

app.post('/sreachRestaurant',function(req,res){
	var name = req.body.name;
	var borough = req.body.borough;
	var cuisine = req.body.cuisine;
	var street = req.body.street;
	var building = req.body.building;
	var zipcode = req.body.zipcode;
	var lon = req.body.lon;
	var lat = req.body.lat;
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
		findRestaurant(db,criteria,function(restaurant){
			db.close();
			res.status(200).render("sreachRestaurant",{'name':name,'borough':borough,'cuisine':cuisine,'street':street,'building':building,'zipcode':zipcode,'lon':lon,'lat':lat,'restaurant':restaurant,'user': req.session.userID});
		});
	});
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
		  callback(temp);
		}
		});
}

app.listen(process.env.PORT || 8099);
