var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var sockjs = require('sockjs');
var TokenSocketServer = require("node-token-sockjs");
var redis = require("redis");
var redisClient = redis.createClient(), pubsubClient = redis.createClient();
var socketServer = sockjs.createServer();

var app = express();

var socketOptions = {
	prefix : "/sockets"
};

//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(require('express-session')({
    secret: 'craftzone', //сменить
    resave: false,
    saveUninitialized: false
}));


app.use('/', require('./routes/index'));

app.get('/room/:id/:key', require('./routes/room'));


var customMiddleware = function (req, res, next) {
	req.session.code = req.query.code;
	req.session.auth = true;
	next();
};

var tokenServer = new TokenSocketServer(app, redisClient, socketServer, {
	prefix : socketOptions.prefix,
	tokenRoute : "/socket/token",
	pubsubClient : pubsubClient,
	authentication : "auth",
	customMiddleware : customMiddleware,
	debug : false,
	ping : true
});

var registerRoom = function (room, password, callback) {
	redisClient.incr('global:nextRoomId', function (err, uid) {
		if (uid) {
			redisClient.get('room:' + room + ':id', function (err, id) {
				if (!id) {
					redisClient.set('uid:' + uid + ':room', room, function (err) {
						redisClient.set('uid:' + uid + ':password', password, function (err) {
							redisClient.set('room:' + room + ':id', uid, function (err) {
								redisClient.incr('uid:' + uid + ':online');
								callback(false, parseInt(uid.toString()));
							});
						});
					});
				} else {
					redisClient.get('uid:' + id + ':password', function (err, pass) {
						if(password === pass) {
							redisClient.incr('uid:' + id + ':online');
							callback(false, parseInt(id.toString()));
						} else {
							callback({error:''});
						}
					});	
				}
			});
		} else {
			callback('Cannot get UID: ' + err);
		}
	});
};

var deleteRoom = function (room) {
	redisClient.get('room:' + room + ':id', function (err, id) {
		if(id) {
			redisClient.decr('uid:' + id + ':online', function (err, online) {
				if(online <= 0) {
					redisClient.del('room:' + room + ':id');
					redisClient.del('uid:' + id + ':room');
					redisClient.del('uid:' + id + ':password');
					redisClient.del('uid:' + id + ':online');
				}
			});
		}
	});
};


tokenServer.on("subscribe", function(socket, data, callback) {
	registerRoom(data.channel, socket.auth.code, function(err, uid) {
		if(err) {
			callback(err, false);
			return;
		}
		callback('success', true);
	});
});

tokenServer.on("publish", function(socket, data, callback){
	data.data.login = socket.id;
    callback(null, true);
});

tokenServer.on("close", function(socket, channel){
	deleteRoom(channel);
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports.app = app;
module.exports.socketServer = socketServer;
module.exports.socketOptions = socketOptions;