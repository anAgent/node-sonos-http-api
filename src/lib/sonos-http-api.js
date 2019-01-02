'use strict';
const requireDir = require('./helpers/require-dir');
const path = require('path');
const logger = require('sonos-discovery/lib/helpers/logger');

class HttpAPI {

    /**
     *
     * @param sonosDiscovery
     * @param settings
     */
    constructor(sonosDiscovery: SonosDiscovery, settings: Settings) {
        this.sonosDiscovery = sonosDiscovery;
        this.actions = {};
        this.settings = settings;

        //load modularized actions
        requireDir(path.join(__dirname, './actions'), (registerAction) => {
            registerAction(this);
        });
    }

    /**
     *
     * @returns {number}
     */
    getPort() {
        return this.settings.port;
    }

    /**
     *
     * @param action
     * @param handler
     */
    registerAction (action, handler) {
        this.actions[action] = handler;
    }

    /**
     *
     * @param req
     * @param res
     */
    requestHandler (req, res) {
        if (req.url === '/favicon.ico') {
            res.end();
            return;
        }
        const sendResponse = this.bindResponseCallback(res);
        const getResponseStatusFromResponse = this.getResponseStatusFromResponse;

        if (this.sonosDiscovery.zones.length === 0) {
            const msg = 'No system has yet been discovered. Please see https://github.com/jishi/node-sonos-http-api/issues/77 if it doesn\'t resolve itself in a few seconds.';
            logger.error(msg);
            sendResponse(500, { status: 'error', error: msg });
            return;
        }

        const params = req.url.substring(1).split('/');

        // parse decode player name considering decode errors
        let player;
        const opt = {};

        try {
            player = this.sonosDiscovery.getPlayer(decodeURIComponent(params[0]));

            if (player) {
                opt.action = (params[1] || '').toLowerCase();
                opt.values = params.splice(2);
            } else {
                player = this.sonosDiscovery.getAnyPlayer();
                opt.action = (params[0] || '').toLowerCase();
                opt.values = params.splice(1);
            }

            opt.player = player;

        } catch (error) {
            logger.error(`Unable to parse supplied URI component (${params[0]})`, error);
            return sendResponse(500, { status: 'error', error: error.message, stack: error.stack });
        }

        Promise.resolve(this.handleAction(opt))
            .then(response => {
                response = getResponseStatusFromResponse(response);
                sendResponse(200, response);
            })
            .catch((error) => {
                logger.error(error);
                sendResponse(500, { status: 'error', error: error.message, stack: error.stack });
            });
    }

    getResponseStatusFromResponse(response) {
        const isInComingMessage = (!response || response.constructor.name === 'IncomingMessage');
        const isHydratedMessage = (Array.isArray(response) && response.length > 0 && response[0].constructor.name === 'IncomingMessage');

        if (isInComingMessage || isHydratedMessage) {
            return { status: 'success' };
        } else {
            return response;
        }
    }

    /**
     *
     * @param res
     * @returns {Function}
     */
    bindResponseCallback(res) : (res: any, body: string) => void {
        return (code, body) => {
            const jsonResponse = JSON.stringify(body);
            res.statusCode = code;
            res.setHeader('Content-Length', Buffer.byteLength(jsonResponse));
            res.setHeader('Content-Type', 'application/json;charset=utf-8');
            res.write(new Buffer(jsonResponse));
            res.end();
        }
    }

    /**
     *
     * @param options
     * @returns {*}
     */
    handleAction(options) {
        const player = options.player;

        if (!this.actions[options.action]) {
            return Promise.reject({ error: 'action \'' + options.action + '\' not found' });
        }

        return this.actions[options.action](player, options.values);
    }
}

module.exports = HttpAPI;
