# homebridge-bticino-registration v2.0

Komplette BTicino Doorbell Integration für Homebridge mit:

- ✅ **Doorbell-Accessory** direkt in HomeKit
- ✅ **HTTP-Server** für Webhook-Empfang
- ✅ **Automatische Endpoint-Registrierung** beim BTicino

## Features

### Doorbell-Events
Wenn jemand klingelt, sendet der BTicino c300x-controller einen Webhook an dieses Plugin.
Das Plugin triggert dann ein HomeKit Doorbell-Event → Benachrichtigung auf allen Apple-Geräten.

### HTTP-Server Endpoints

| Endpoint | Beschreibung |
|----------|-------------|
| `/doorbell` | Triggert Doorbell-Event in HomeKit |
| `/locked` | Loggt "Tür verriegelt" |
| `/unlocked` | Loggt "Tür entriegelt" |
| `/status` | Zeigt Plugin-Status |

### Automatische Registrierung
Das Plugin registriert die Webhook-URLs automatisch beim BTicino (alle 4 Minuten).

## Installation

```bash
cd /path/to/homebridge-bticino-registration
npm install
npm run build
npm link
```

## Konfiguration

```json
{
    "platforms": [
        {
            "platform": "BTicinoRegistration",
            "name": "BTicino Doorbell",
            "bticinoIP": "192.168.178.65",
            "homebridgeIP": "192.168.178.157",
            "webhookPort": 8282,
            "interval": 4,
            "identifier": "homebridge"
        }
    ]
}
```

### Optionen

| Option | Erforderlich | Standard | Beschreibung |
|--------|-------------|----------|--------------|
| `platform` | ✅ | - | Muss `BTicinoRegistration` sein |
| `name` | ✅ | - | Name für Logs |
| `bticinoIP` | ✅ | - | IP-Adresse des BTicino Intercoms |
| `homebridgeIP` | ✅ | - | IP-Adresse des Homebridge-Servers |
| `webhookPort` | ❌ | `8282` | Port für den Webhook-Server |
| `interval` | ❌ | `4` | Registrierungs-Intervall in Minuten |
| `identifier` | ❌ | `homebridge` | Identifier für die Registrierung |

## Kombination mit homebridge-camera-ffmpeg

Dieses Plugin stellt nur das **Doorbell-Accessory** und die **Webhook-Verarbeitung** bereit.

Für **Video-Streaming** braucht ihr zusätzlich `homebridge-camera-ffmpeg`:

```json
{
    "platforms": [
        {
            "platform": "BTicinoRegistration",
            "name": "BTicino Doorbell",
            "bticinoIP": "192.168.178.65",
            "homebridgeIP": "192.168.178.157",
            "webhookPort": 8282
        },
        {
            "platform": "Camera-ffmpeg",
            "name": "Camera FFmpeg",
            "cameras": [
                {
                    "name": "BTicino Doorbell",
                    "videoConfig": {
                        "source": "-rtsp_transport tcp -i rtsp://192.168.178.65:6554/doorbell",
                        ...
                    }
                }
            ]
        }
    ]
}
```

**Hinweis:** Der Kamera-Name muss mit dem Doorbell-Accessory übereinstimmen damit HomeKit sie verknüpft.

## Logs

```
[BTicino Doorbell] BTicino Registration Plugin initialisiert
[BTicino Doorbell] BTicino IP: 192.168.178.65
[BTicino Doorbell] Webhook Port: 8282
[BTicino Doorbell] ✓ Doorbell Accessory bereit
[BTicino Doorbell] ✓ HTTP-Server gestartet auf Port 8282
[BTicino Doorbell] ✓ Endpoints registriert bei 192.168.178.65
[BTicino Doorbell] 🔔 DOORBELL PRESSED - Klingel wurde gedrückt!
[BTicino Doorbell] ✓ HomeKit Doorbell-Event gesendet
```

## Test

```bash
# Doorbell manuell testen
curl http://192.168.178.157:8282/doorbell

# Status prüfen
curl http://192.168.178.157:8282/status
```

## Troubleshooting

### Keine Doorbell-Benachrichtigungen
- Port 8282 auf QNAP offen? (Firewall)
- Endpoints registriert? Prüfe `http://192.168.178.65:8080/register-endpoint`
- Plugin-Logs prüfen

### Endpoints werden nicht registriert
- BTicino erreichbar? `ping 192.168.178.65`
- c300x-controller läuft? `http://192.168.178.65:8080/`

## Lizenz

MIT
