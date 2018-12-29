'use strict';

const requireDir = require('./helpers/require-dir');
const path = require('path');
const request = require('sonos-discovery/lib/helpers/request');
const logger = require('sonos-discovery/lib/helpers/logger');

function HttpAPI(discovery, settings) {
  const port = settings.port;
  const webroot = settings.webroot;
  const actions = {};
  this.discovery = discovery;
  this.socket = null;

  this.setSocketIO = function (socket) {
    let _socket;

    if (!this.socket) {
      this.socket = _socket = socket;

      discovery.on('transport-state', (player) => {
        invokeWebhook('transport-state', player, _socket);
      });

      discovery.on('topology-change', (topology) => {
        invokeWebhook('topology-change', topology, _socket);
      });

      discovery.on('volume-change', (volumeChange) => {
        invokeWebhook('volume-change', volumeChange, _socket);
      });

      discovery.on('mute-change', (muteChange) => {
        invokeWebhook('mute-change', muteChange, _socket);
      });
    }
  };

  this.getWebRoot = function () {
    return webroot;
  };

  this.getPort = function () {
    return port;
  };

  // this handles registering of all actions
  this.registerAction = function (action, handler) {
    actions[action] = handler;
  };

  // load modularized actions
  requireDir(path.join(__dirname, './actions'), (registerAction) => {
    registerAction(this);
  });

  this.requestHandler = function (req, res) {
    if (req.url === '/favicon.ico') {
      res.end();
      return;
    }

    if (discovery.zones.length === 0) {
      const msg = 'No system has yet been discovered. Please see https://github.com/jishi/node-sonos-http-api/issues/77 if it doesn\'t resolve itself in a few seconds.';
      logger.error(msg);
      sendResponse(500, { status: 'error', error: msg });
      return;
    }

    const params = req.url.substring(1).split('/');

    // parse decode player name considering decode errors
    let player;
    try {
      player = discovery.getPlayer(decodeURIComponent(params[0]));
    } catch (error) {
      logger.error(`Unable to parse supplied URI component (${params[0]})`, error);
      return sendResponse(500, { status: 'error', error: error.message, stack: error.stack });
    }

    const opt = {};

    if (player) {
      opt.action = (params[1] || '').toLowerCase();
      opt.values = params.splice(2);
    } else {
      player = discovery.getAnyPlayer();
      opt.action = (params[0] || '').toLowerCase();
      opt.values = params.splice(1);
    }

    function sendResponse(code, body) {
      const jsonResponse = JSON.stringify(body);
      res.statusCode = code;
      res.setHeader('Content-Length', Buffer.byteLength(jsonResponse));
      res.setHeader('Content-Type', 'application/json;charset=utf-8');
      res.write(new Buffer(jsonResponse));
      res.end();
    }

    opt.player = player;
    Promise.resolve(handleAction(opt))
      .then((response) => {
        if (!response || response.constructor.name === 'IncomingMessage') {
          response = { status: 'success' };
        } else if (Array.isArray(response) && response.length > 0 && response[0].constructor.name === 'IncomingMessage') {
          response = { status: 'success' };
        }

        sendResponse(200, response);
      }).catch((error) => {
        logger.error(error);
        sendResponse(500, { status: 'error', error: error.message, stack: error.stack });
      });
  };

  function handleAction(options) {
    const player = options.player;

    if (!actions[options.action]) {
      return Promise.reject({ error: `action '${options.action}' not found` });
    }

    return actions[options.action](player, options.values);
  }

  function invokeWebhook(type, data, socket) {
    logger.debug(type, Object.keys(socket).join(','));

    let typeName = 'type';
    let dataName = 'data';
    if (!settings.webhook) return;

    if (settings.webhookType) { typeName = settings.webhookType; }
    if (settings.webhookData) { dataName = settings.webhookData; }

    const jsonBody = JSON.stringify({
      [typeName]: type,
      [dataName]: data
    });

    const body = new Buffer(jsonBody, 'utf8');

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': body.length
    };

    if (settings.webhookHeaderName && settings.webhookHeaderContents) {
      headers[settings.webhookHeaderName] = settings.webhookHeaderContents;
    }

    // Hookup socket IO.
    if (settings.webhook === 'socket.io') {
      console.debug(`Socket.Emit -> event:${type}`);
      socket.emit(`event:${type}`, jsonBody);
    } else {
      request({
        method: 'POST',
        uri: settings.webhook,
        headers,
        body
      })
        .catch((err) => {
          logger.error('Could not reach webhook endpoint', settings.webhook, 'for some reason. Verify that the receiving end is up and running.');
          logger.error(err);
        });
    }
  }
}

module.exports = HttpAPI;
