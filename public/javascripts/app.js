$(function () {
	var options = {
		host : "http://176.112.196.194:3000",
		tokenPath : "/socket/token",
		socketPrefix : "/sockets",
		authentication: {
			code: ROOM_KEY
		},
		reconnect : true
	};
	var actions = {
		ping : function (data, callback) {
			callback(null, data);
		},
		nested : {
			foo : function (data, callback) {
				callback(null, "foo");
			}
		}
	};
	var socket = new TokenSocket(options, actions);

	$('#first input').focus();
	var div = $('#first div');
	var inp = $('#first input');
	var form = $('#first form');
	var print = function (m, p) {
		p = (p === undefined) ? '' : JSON.stringify(p);
		div.append($("<code>").text(m + ' ' + p));
		div.append($("<br>"));
		div.scrollTop(div.scrollTop() + 10000);
	};

	socket.ready(function (error) {
		socket.subscribe(ROOM_ID, function (error) {
			print('[SYSTEM]', error);
		});
	});

	socket.onmessage(function (channel, message) {
		if (channel == ROOM_ID)
			print('[' + message.login + ']',
				message.message);
	});
	
	form.submit(function () {
		socket.publish(ROOM_ID, {
			message : inp.val()
		});
		inp.val('');
		return false;
	});
});
