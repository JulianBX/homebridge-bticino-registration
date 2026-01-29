import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';

const PLUGIN_NAME = 'homebridge-bticino-registration';
const PLATFORM_NAME = 'BTicinoRegistration';

interface BTicinoConfig extends PlatformConfig {
  bticinoIP: string;
  homebridgeIP: string;
  cameraName: string;
  ffmpegHttpPort: number;
  interval: number;
  identifier: string;
}

export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, BTicinoRegistrationPlatform);
};

class BTicinoRegistrationPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  private readonly config: BTicinoConfig;
  private registrationInterval: NodeJS.Timeout | null = null;

  constructor(
    public readonly log: Logger,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;
    this.config = config as BTicinoConfig;

    // Validierung
    if (!this.config.bticinoIP || !this.config.homebridgeIP) {
      this.log.error('bticinoIP und homebridgeIP müssen konfiguriert sein!');
      return;
    }

    // Defaults setzen
    this.config.cameraName = this.config.cameraName || 'BTicino Doorbell';
    this.config.ffmpegHttpPort = this.config.ffmpegHttpPort || 8081;
    this.config.interval = this.config.interval || 4;
    this.config.identifier = this.config.identifier || 'homebridge';

    this.log.info('BTicino Registration Plugin initialisiert');
    this.log.info(`BTicino IP: ${this.config.bticinoIP}`);
    this.log.info(`Homebridge IP: ${this.config.homebridgeIP}`);
    this.log.info(`Camera Name: ${this.config.cameraName}`);
    this.log.info(`FFmpeg HTTP Port: ${this.config.ffmpegHttpPort}`);
    this.log.info(`Registrierungs-Intervall: ${this.config.interval} Minuten`);

    // Wenn Homebridge fertig geladen hat
    this.api.on('didFinishLaunching', () => {
      this.log.info('Homebridge fertig geladen, starte Endpoint-Registrierung...');
      
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
    });
  }

  /**
   * Registriert die Webhook-Endpoints beim BTicino Controller
   * Die Webhooks zeigen auf den HTTP-Server von homebridge-camera-ffmpeg
   */
  private async registerEndpoints(): Promise<void> {
    const { bticinoIP, homebridgeIP, cameraName, ffmpegHttpPort, identifier } = this.config;

    // URL-encode den Camera-Namen
    const encodedCameraName = encodeURIComponent(cameraName);

    // URLs für homebridge-camera-ffmpeg HTTP-Server
    const pressedUrl = `http://${homebridgeIP}:${ffmpegHttpPort}/doorbell?deviceName=${encodedCameraName}`;
    const lockedUrl = `http://${homebridgeIP}:${ffmpegHttpPort}/doorbell?deviceName=${encodedCameraName}&locked=true`;
    const unlockedUrl = `http://${homebridgeIP}:${ffmpegHttpPort}/doorbell?deviceName=${encodedCameraName}&unlocked=true`;

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
        this.log.debug(`  Doorbell URL: ${pressedUrl}`);
      } else {
        this.log.warn(`✗ Registrierung fehlgeschlagen: HTTP ${response.status}`);
        const body = await response.text();
        if (body) {
          this.log.warn(`  Response: ${body}`);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        this.log.error(`✗ Fehler bei Registrierung: ${error.message}`);
      } else {
        this.log.error('✗ Unbekannter Fehler bei Registrierung');
      }
    }
  }

  /**
   * Wird von Homebridge aufgerufen, um gecachte Accessories wiederherzustellen
   * Dieses Plugin hat keine Accessories
   */
  configureAccessory(accessory: PlatformAccessory): void {
    // Dieses Plugin erstellt keine Accessories
  }
}
