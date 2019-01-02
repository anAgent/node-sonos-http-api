const request = require('sonos-discovery/lib/helpers/request');
const logger = require('sonos-discovery/lib/helpers/logger');
/**
 * Cached clients for socket connection.
 * @type {{}}
 */
let clients = {};

/**
 *
 * @param sonosDiscover
 * @param settings
 * @param io
 * @returns {SonosDiscoverBus}
 * @constructor
 */
const SonosDiscoverBus = function (sonosDiscover: SonosDiscovery, settings: Settings, io?: SocketIO) {
    this.sonosDiscover = sonosDiscover;
    this.settings = settings;
    this.io = io;

    if(settings.webhook) {
        this.eventNotificationCallback = this.io ? this.emitSocketMessage : this.invokeWebHook;
        this.bindSocketConnection();

        this.sonosDiscover
            .on(this.Events.TransportState, this.onTransportStateChange.bind(this))
            .on(this.Events.TopologyChange, this.onTopologyStateChange.bind(this))
            .on(this.Events.VolumeChange, this.onVolumeChange.bind(this))
            .on(this.Events.MuteChange, this.onMuteChange.bind(this));
    }

    return this;
};

/**
 * Bind the socket IO connection to close client connections on disconnect.
 */
SonosDiscoverBus.prototype.bindSocketConnection = function () {
    if(this.io) {
        this.io.on('connection', (socket: {id: string, request: {connection: {remoteAddress: string}}}) => {
            const id = socket.id;
            const ip = socket.request.connection.remoteAddress;
            const client: SocketClient = clients[socket.id] || {
                socket: socket,
                ip
            };
            client.socket.on('disconnect', () => {
                logger.info(`Client Disconnected: ${ip}`);
                delete clients[id];
            });

            logger.info(`Client Connected: ${ip}`);
        });
    }
};

/**
 * The function that is invoked on an event change.
 * @type {null}
 */
SonosDiscoverBus.prototype.eventNotificationCallback = null;

/**
 *
 * @type {{VolumeChange: string, TopologyChange: string, TransportState: string, MuteChange: string}}
 */
SonosDiscoverBus.prototype.Events = {
    TransportState: 'transport-state',
    TopologyChange: 'topology-change',
    VolumeChange: 'volume-change',
    MuteChange: 'mute-change',
};

/**
 *
 * @param playerChangeEvent
 */
SonosDiscoverBus.prototype.onTransportStateChange = function (playerChangeEvent: PlayerChangeEvent) {
    this.eventNotificationCallback(this.Events.TransportState, playerChangeEvent);
};

/**
 *
 * @param playerChangeEvent
 */
SonosDiscoverBus.prototype.onTopologyStateChange = function (playerChangeEvent: PlayerChangeEvent) {
    this.eventNotificationCallback(this.Events.TopologyChange, playerChangeEvent);
};

/**
 *
 * @param volumeChangeEvent
 */
SonosDiscoverBus.prototype.onVolumeChange = function (volumeChangeEvent: VolumeChangeEvent) {
    this.eventNotificationCallback(this.Events.VolumeChange, volumeChangeEvent);
};

/**
 *
 * @param muteChangeEvent
 */
SonosDiscoverBus.prototype.onMuteChange = function (muteChangeEvent: MuteChangeEvent) {
    this.eventNotificationCallback(this.Events.MuteChange, muteChangeEvent);
};

/**
 *
 * @param type
 * @param data
 */
SonosDiscoverBus.prototype.invokeWebHook = function (type: string, data: EventItem) {
    if (!this.settings.webhook) return;

    let typeName = this.settings.webhookType || 'type';
    let dataName = this.settings.webhookData || 'data';

    const jsonBody = JSON.stringify({
        [typeName]: type,
        [dataName]: data
    });

    const body = new Buffer(jsonBody, 'utf8');

    if (settings.webhookHeaderName && settings.webhookHeaderContents) {
        headers[settings.webhookHeaderName] = settings.webhookHeaderContents;
    }

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
};

/**
 * Delegate callback to emit socket.io message.
 * @param type {string} - the event type name.
 * @param data {any} - the event data
 */
SonosDiscoverBus.prototype.emitSocketMessage = function (type: string, data: EventItem) {
    if (!this.settings.webhook) return;

    let typeName = this.settings.webhookType || 'type';
    let dataName = this.settings.webhookData || 'data';

    const jsonBody = JSON.stringify({
        [typeName]: type,
        [dataName]: data
    });

    this.io.sockets.emit(`event:${type}`, jsonBody);
};

module.exports = SonosDiscoverBus;
