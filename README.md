# homebridge-bticino-registration v3.0

Registriert Webhook-Endpoints beim BTicino c300x-controller für `homebridge-camera-ffmpeg`.

## Funktionsweise

```
                          Registrierung (alle 4 Min)
┌──────────────────┐     ────────────────────────────►    ┌──────────────────┐
│  Unser Plugin    │                                      │  BTicino c300x   │
│  (Registration)  │                                      │  controller      │
└──────────────────┘                                      └──────────────────┘
                                                                   │
                                                                   │ Webhook bei Klingel
                                                                   ▼
┌──────────────────┐     ◄────────────────────────────    ┌──────────────────┐
│  camera-ffmpeg   │      POST /doorbell?deviceName=...   │  BTicino         │
│  (HTTP Server)   │                                      │                  │
└──────────────────┘                                      └──────────────────┘
         │
         │ HomeKit Doorbell Event
         ▼
    📱 iPhone
```

## Konfiguration

```json
{
    "platform": "BTicinoRegistration",
    "name": "BTicino Registration",
    "bticinoIP": "192.168.178.65",
    "homebridgeIP": "192.168.178.157",
    "cameraName": "BTicino Doorbell",
    "ffmpegHttpPort": 8081,
    "interval": 4,
    "identifier": "homebridge"
}
```

### Optionen

| Option | Erforderlich | Standard | Beschreibung |
|--------|-------------|----------|--------------|
| `bticinoIP` | ✅ | - | IP des BTicino Intercoms |
| `homebridgeIP` | ✅ | - | IP des Homebridge-Servers |
| `cameraName` | ❌ | `BTicino Doorbell` | Name der Kamera in camera-ffmpeg (muss übereinstimmen!) |
| `ffmpegHttpPort` | ❌ | `8081` | Port von camera-ffmpeg `porthttp` |
| `interval` | ❌ | `4` | Registrierungs-Intervall in Minuten |

**Wichtig:** `cameraName` muss exakt mit dem `name` in der camera-ffmpeg Config übereinstimmen!

## Installation

```bash
cd /homebridge/homebridge-bticino-registration-v3
npm install
npm run build
npm link
```

## Zusammenarbeit mit camera-ffmpeg

Dieses Plugin registriert die URL:
```
http://<homebridgeIP>:<ffmpegHttpPort>/doorbell?deviceName=<cameraName>
```

Diese URL wird von `homebridge-camera-ffmpeg` (mit `porthttp` aktiviert) empfangen und triggert das Doorbell-Event.

**camera-ffmpeg muss so konfiguriert sein:**
- `porthttp: 8081` (auf Platform-Ebene)
- `doorbell: true` (in der Camera-Config)
- `name` muss mit `cameraName` übereinstimmen
