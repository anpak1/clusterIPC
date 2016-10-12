/*
* clusterIPC
* @autor: an.pakosh@gmail.com
* @version: 1.0
* @fileOverview 
* 	clusterIPC provide inter process communications interface for node.js processes

Provide main interface

clusterIPC.prototype.server = {

	// Main function for requests
	// !!! Will be overridden in a parent code
	request: function(req, res){

		// request counter inside process
		this.generator.nextId();
	},

	// Main function for closing procedure
	// !!! Will be overridden in a parent code
	close: function(){
		// server cleanup function
	}
}

clusterIPC.prototype.process = {

	// Messages handler
	message: function(msg) {
		...
	}
}

* @example 
	var server = http.createServer(),
		ClusterIPC = require('./clusterIPC.js');

		clusterIPC = new ClusterIPC(server, process, {
			generator: generator
		});

		clusterIPC.server.request = function (req, res) {			

			res.writeHead(200, {				
				'Expires' :  new Date(+new Date() - 1).toUTCString(),
				'Cache-Control' : 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0',
				'Pragma' : 'no-cache',
				'Last-Modified' : new Date().toUTCString(),
				'Content-Length': 0,
				'Content-Type': 'image/png',
				'Connection': 'Close'
			});
			
			...
			// do something here
			...
			res.end();			
		};

		clusterIPC.server.connection = function(socket) {
			socket.setNoDelay(); // disable nagle algorithm
		};

		clusterIPC.server.close = function() {
		    // cleanup or additional before exit		
		};

		clusterIPC.smartObjects['console'] = console;

		process.title = 'rc';

		var exitFunction = function () {
		  batchPool.flush(function(){
		  	process.exit(0);
		  });
		}

		try{
			process.on('SIGINT', exitFunction);
			process.on('SIGKILL', exitFunction);
			process.on('SIGTERM', exitFunction);
			process.on('SIGHUP', exitFunction);

			process.on('SIGUSR1', function(){
				console.log(process.pid, 'requests:: ', generator.current());
			});
		}catch(e){

		}

		clusterIPC.bindEvents();
		server.listen(8010, 'localhost', function(){
			console.log(process.title + ' running pid::' + process.pid + ' on ' + 8080 + ' port');
		});
*/

'use strict';

// codes for IPC messages
var ipcCMD = {
		'status': 1,
		'force kill': 2,
		'delayed kill': 3,
	    'debug on': 5,
	    'debug off': 6
	}

/*
	_server - node.js http.createServer()
	_process - node.js process object
	options - additional parameters such as custom process_id generator, smartObjects and so on

	options.ipcCMD - inter process communication codes
	options.generator - request counter inside process
	options.smartObjects - parent objects container

*/
var clusterIPC = module.exports = function(_server, _process, options) {

	this._process = _process;
	this._server = _server;

	this.ipcCMD = options.ipcCMD || ipcCMD;
	this.generator = options.generator || new require('./idgenerator.js')();
	this.smartObjects = options.smartObjects || {};

}

clusterIPC.prototype.process = {

	message: function(msg) {
		console.log(this._process.pid, ' has recieved msg::', msg);
		// process message function
		var self = this;

		switch(msg){

			case this.ipcCMD['status']:
				this._process.send({
					c: this.generator.current(), // number of requests
					id: this._process.pid,
					cmd: this.ipcCMD['status']
				});
				break;

			case this.ipcCMD['force kill']:
				
				if (self.smartObjects.batchPoll){
					
					self.smartObjects.batchPoll.flush(function(){
						self._process.exit(0);
					});
				}else{
					self._process.exit(0);
				}
				break;

			case this.ipcCMD['delayed kill']:
				setTimeout(function(){
					//console.log(self);
					if (self.smartObjects.batchPoll){

						self.smartObjects.batchPoll.flush(function(){
							self._process.exit(0);
						});
					}else{
						self._process.exit(0);
					}
					//self._process.destroy();
				}, 60000);
				break;
			
			case this.ipcCMD['debug on']:

				if (self.smartObjects.console){
					self.smartObjects.console.log = self.smartObjects.console._log;
				}

				break;

			case this.ipcCMD['debug off']:

				if (self.smartObjects.console){
					self.smartObjects.console._log = self.smartObjects.console.log;
					self.smartObjects.console.log = function(){};
				}

				break;

			default:

				break;
		}
	}
}

clusterIPC.prototype.server = {

	// !!! Will be overridden in a parent code
	request: function(req, res){
		this.generator.nextId();
	},

	// !!! Will be overridden in a parent code
	close: function(){
		// server cleanup function
	}
}

clusterIPC.prototype.bindEvents = function(){

	this.bindProcessEvents();
	this.bindServerEvents();
}

clusterIPC.prototype.bindProcessEvents = function(){

	for( var event in this.process) {

		this._process.on(event, this.process[event].bind(this));
	}
}

clusterIPC.prototype.bindServerEvents = function(){

	for( var event in this.server) {

		this._server.on(event, this.server[event]);
	}
}
