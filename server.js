// Modules

var http = require('http');
var path = require('path');

var logger = require('logfmt');
var jackrabbit = require('jackrabbit');
var express = require('express');

var parallel = require('./parallel');

// Config

var RABBIT_URL = process.env.CLOUDAMQP_URL || 'amqp://gbdgnqhr:RfSRtr52b2uhlnXpBV7DD531GZsBcVDk@tiger.cloudamqp.com/gbdgnqhr';
var PORT = process.env.PORT || 5000;
var SERVICE_TIME = process.env.SERVICE_TIME || 500;

// Startup

http.globalAgent.maxSockets = Infinity;
logger.log({ type: 'info', message: 'starting' });

var broker = jackrabbit(RABBIT_URL, 1)
  .once('connected', onBroker)
  .once('disconnected', onBrokerLost);

var server = express()
  .set('view engine', 'jade')
  .set('view cache', true)
  .get('/', parallel([ getTest, getWeather, getQuote, getCute ], SERVICE_TIME), renderHome)
  .listen(PORT, onListen);

// Callbacks

function onBroker() {
  logger.log({ type: 'info', message: 'connected', service: 'broker' });
  broker.create('weather.get');
  broker.create('quote.get');
  broker.create('cute.get');
}

function onListen(err) {
  if (err) throw err;
  logger.log({ type: 'info', message: 'listening', port: PORT });
}

function onBrokerLost() {
  logger.log({ type: 'error', message: 'disconnected', service: 'broker' });
  process.exit();
}

function getTest(req,res,next) {
    res.locals.test = req.query.test;
    if (typeof(req.query.zip) === 'undefined'){
	console.log(typeof(req.query.zip));
	res.locals.testresult = 'zip undefined';
    }else if ((req.query.zip).length != 5){
	console.log("not right length");
	res.locals.testresult = 'zip incorrect length'; 	    
    }else {
	console.log(req.query.zip);
	res.locals.testresult = 'valid zip length'; 
    }
    next();
}

function getWeather(req, res, next) {
  broker.publish('weather.get', { zip: req.query.zip }, function onWeather(err, weather) {
    res.locals.weather = weather;
    next();
  });
}

function getQuote(req, res, next) {
  broker.publish('quote.get', {}, function onQuote(err, quote) {
    res.locals.quote = quote;
    next();
  });
}

function getCute(req, res, next) {
  broker.publish('cute.get', {}, function onCute(err, cute) {
    res.locals.cute = cute;
    next();
  });
}

function renderHome(req, res, next) {
  res.render(path.join(__dirname, 'home'));
}
