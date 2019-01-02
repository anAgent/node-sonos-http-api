//@flow

declare type SocketIO = {
    on: (eventName: string, callback: (eventItem: EventItem) => void) => SocketIO;
}

declare type SocketClient = {
    socket: SocketIO;
}

declare type Settings = {
    port: number;
    ip: string;
    securePort: number;
    securePort: number,
    cacheDir:string;
    webroot:string;
    presetDir:string;
    announceVolume: number;
    webhook: string;
    webhookType?: string;
    webhookData?: string;
    webhookHeaderName?: string;
    webhookHeaderContents?: any;
}

declare type PlayerChangeEvent = {};
declare type TopologyChangeEvent = {};
declare type VolumeChangeEvent = {};
declare type MuteChangeEvent = {
    uuid: string;
    previousMute: boolean;
    newMute: boolean;
    roomName: string;
};
declare type EventItem = PlayerChangeEvent | TopologyChangeEvent | VolumeChangeEvent | MuteChangeEvent;

declare type SonosDiscovery = {
    getPlayer: (name: string) => any;
    getPlayerByUUID: (uuid: string) => any;
    getAnyPlayer: () => any;
    dispose: () => void;
    getServiceType: (serviceName:string) => any;
    on: (eventName: string, callback: (eventItem: EventItem) => void) => SonosDiscovery;
}
