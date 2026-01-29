"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
const http = __importStar(require("http"));
const url_1 = require("url");
const PLUGIN_NAME = 'homebridge-bticino-registration';
const PLATFORM_NAME = 'BTicinoRegistration';
class BTicinoRegistrationPlatform {
    log;
    api;
    Service;
    Characteristic;
    config;
    registrationInterval = null;
    httpServer = null;
    // Doorbell Accessory
    doorbellAccessory = null;
    doorbellService = null;
    constructor(log, config, api) {
        this.log = log;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.config = config;
        // Validierung
        if (!this.config.bticinoIP || !this.config.homebridgeIP) {
            this.log.error('bticinoIP und homebridgeIP müssen konfiguriert sein!');
            return;
        }
        // Defaults setzen
        this.config.webhookPort = this.config.webhookPort || 8282;
        this.config.interval = this.config.interval || 4;
        this.config.identifier = this.config.identifier || 'homebridge';
        this.log.info('BTicino Registration Plugin initialisiert');
        this.log.info(`BTicino IP: ${this.config.bticinoIP}`);
        this.log.info(`Homebridge IP: ${this.config.homebridgeIP}`);
        this.log.info(`Webhook Port: ${this.config.webhookPort}`);
        this.log.info(`Registrierungs-Intervall: ${this.config.interval} Minuten`);
        // Wenn Homebridge fertig geladen hat
        this.api.on('didFinishLaunching', () => {
            this.log.info('Homebridge fertig geladen');
            // Doorbell Accessory erstellen
            this.setupDoorbellAccessory();
            // HTTP-Server starten
            this.startHttpServer();
            // Sofort registrieren
            this.registerEndpoints();
            // Dann alle X Minuten
            const intervalMs = this.config.interval * 60 * 1000;
            this.registrationInterval = setInterval(() => {
                this.registerEndpoints();
            }, intervalMs);
        });
        // Cleanup bei Shutdown
        this.api.on('shutdown', () => {
            if (this.registrationInterval) {
                clearInterval(this.registrationInterval);
                this.log.info('Registrierungs-Interval gestoppt');
            }
            if (this.httpServer) {
                this.httpServer.close();
                this.log.info('HTTP-Server gestoppt');
            }
        });
    }
    // Cache für wiederhergestellte Accessories
    accessories = [];
    /**
     * Erstellt das Doorbell-Accessory für HomeKit
     */
    setupDoorbellAccessory() {
        const uuid = this.api.hap.uuid.generate('bticino-doorbell');
        const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);
        if (existingAccessory) {
            this.log.info('Doorbell Accessory aus Cache geladen');
            this.doorbellAccessory = existingAccessory;
        }
        else {
            this.log.info('Neues Doorbell Accessory erstellen');
            this.doorbellAccessory = new this.api.platformAccessory('BTicino Doorbell', uuid);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.doorbellAccessory]);
        }
        // Doorbell Service hinzufügen/abrufen
        this.doorbellService = this.doorbellAccessory.getService(this.Service.Doorbell) ||
            this.doorbellAccessory.addService(this.Service.Doorbell, 'BTicino Doorbell');
        // Programmable Switch Event Characteristic
        this.doorbellService.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent)
            .onGet(() => null);
        // AccessoryInformation
        const infoService = this.doorbellAccessory.getService(this.Service.AccessoryInformation) ||
            this.doorbellAccessory.addService(this.Service.AccessoryInformation);
        if (infoService) {
            infoService
                .setCharacteristic(this.Characteristic.Manufacturer, 'BTicino')
                .setCharacteristic(this.Characteristic.Model, 'C300X')
                .setCharacteristic(this.Characteristic.SerialNumber, 'DOORBELL-001');
        }
        this.log.info('✓ Doorbell Accessory bereit');
    }
    /**
     * Startet den HTTP-Server für Webhook-Empfang
     */
    startHttpServer() {
        this.httpServer = http.createServer((req, res) => {
            const url = new url_1.URL(req.url || '/', `http://${req.headers.host}`);
            const pathname = url.pathname;
            this.log.debug(`HTTP Request: ${req.method} ${pathname}`);
            // CORS Headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            switch (pathname) {
                case '/doorbell':
                case '/pressed':
                    this.handleDoorbellPressed(req, res);
                    break;
                case '/locked':
                    this.handleDoorLocked(req, res);
                    break;
                case '/unlocked':
                    this.handleDoorUnlocked(req, res);
                    break;
                case '/status':
                    this.handleStatus(req, res);
                    break;
                default:
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Not found', endpoints: ['/doorbell', '/locked', '/unlocked', '/status'] }));
            }
        });
        this.httpServer.listen(this.config.webhookPort, () => {
            this.log.info(`✓ HTTP-Server gestartet auf Port ${this.config.webhookPort}`);
            this.log.info(`  Endpoints:`);
            this.log.info(`  - http://${this.config.homebridgeIP}:${this.config.webhookPort}/doorbell`);
            this.log.info(`  - http://${this.config.homebridgeIP}:${this.config.webhookPort}/locked`);
            this.log.info(`  - http://${this.config.homebridgeIP}:${this.config.webhookPort}/unlocked`);
            this.log.info(`  - http://${this.config.homebridgeIP}:${this.config.webhookPort}/status`);
        });
        this.httpServer.on('error', (err) => {
            this.log.error(`HTTP-Server Fehler: ${err.message}`);
        });
    }
    /**
     * Handler: Doorbell wurde gedrückt
     */
    handleDoorbellPressed(req, res) {
        this.log.info('🔔 DOORBELL PRESSED - Klingel wurde gedrückt!');
        if (this.doorbellService) {
            // Trigger Doorbell Event in HomeKit
            this.doorbellService.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent)
                .updateValue(this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
            this.log.info('✓ HomeKit Doorbell-Event gesendet');
        }
        else {
            this.log.warn('⚠ Doorbell Service nicht verfügbar');
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, event: 'doorbell_pressed', timestamp: new Date().toISOString() }));
    }
    /**
     * Handler: Tür wurde verriegelt
     */
    handleDoorLocked(req, res) {
        this.log.info('🔒 DOOR LOCKED - Tür wurde verriegelt');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, event: 'door_locked', timestamp: new Date().toISOString() }));
    }
    /**
     * Handler: Tür wurde entriegelt
     */
    handleDoorUnlocked(req, res) {
        this.log.info('🔓 DOOR UNLOCKED - Tür wurde entriegelt');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, event: 'door_unlocked', timestamp: new Date().toISOString() }));
    }
    /**
     * Handler: Status abfragen
     */
    handleStatus(req, res) {
        const status = {
            plugin: PLUGIN_NAME,
            bticinoIP: this.config.bticinoIP,
            homebridgeIP: this.config.homebridgeIP,
            webhookPort: this.config.webhookPort,
            doorbellReady: this.doorbellService !== null,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status, null, 2));
    }
    /**
     * Registriert die Webhook-Endpoints beim BTicino Controller
     */
    async registerEndpoints() {
        const { bticinoIP, homebridgeIP, webhookPort, identifier } = this.config;
        // URLs erstellen (zeigen auf unseren eigenen HTTP-Server)
        const pressedUrl = `http://${homebridgeIP}:${webhookPort}/doorbell`;
        const lockedUrl = `http://${homebridgeIP}:${webhookPort}/locked`;
        const unlockedUrl = `http://${homebridgeIP}:${webhookPort}/unlocked`;
        // Base64 kodieren
        const pressedB64 = Buffer.from(pressedUrl).toString('base64');
        const lockedB64 = Buffer.from(lockedUrl).toString('base64');
        const unlockedB64 = Buffer.from(unlockedUrl).toString('base64');
        // Registrierungs-URL zusammenbauen
        const registerUrl = `http://${bticinoIP}:8080/register-endpoint?` +
            `raw=true&` +
            `identifier=${identifier}&` +
            `pressed=${encodeURIComponent(pressedB64)}&` +
            `locked=${encodeURIComponent(lockedB64)}&` +
            `unlocked=${encodeURIComponent(unlockedB64)}&` +
            `verifyUser=false`;
        try {
            const response = await fetch(registerUrl, { method: 'POST' });
            if (response.ok) {
                this.log.info(`✓ Endpoints registriert bei ${bticinoIP}`);
                this.log.debug(`  pressed: ${pressedUrl}`);
                this.log.debug(`  locked: ${lockedUrl}`);
                this.log.debug(`  unlocked: ${unlockedUrl}`);
            }
            else {
                this.log.warn(`✗ Registrierung fehlgeschlagen: HTTP ${response.status}`);
                const body = await response.text();
                if (body) {
                    this.log.warn(`  Response: ${body}`);
                }
            }
        }
        catch (error) {
            if (error instanceof Error) {
                this.log.error(`✗ Fehler bei Registrierung: ${error.message}`);
            }
            else {
                this.log.error('✗ Unbekannter Fehler bei Registrierung');
            }
        }
    }
    /**
     * Wird von Homebridge aufgerufen, um gecachte Accessories wiederherzustellen
     */
    configureAccessory(accessory) {
        this.log.info(`Accessory aus Cache geladen: ${accessory.displayName}`);
        this.accessories.push(accessory);
    }
}
module.exports = (api) => {
    api.registerPlatform(PLATFORM_NAME, BTicinoRegistrationPlatform);
};
