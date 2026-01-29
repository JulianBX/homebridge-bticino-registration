# homebridge-bticino-registration

Homebridge-Plugin zur automatischen Registrierung von Webhook-Endpoints beim BTicino c300x-controller.

## Features

- ✅ Automatische Endpoint-Registrierung beim Homebridge-Start
- ✅ Regelmäßige Erneuerung (Standard: alle 4 Minuten)
- ✅ Keine HomeKit-Automationen nötig
- ✅ Konfigurierbar über Homebridge config.json
- ✅ Sauberes Cleanup beim Herunterfahren

## Installation

### Option 1: Lokal installieren

```bash
cd /path/to/homebridge-bticino-registration
npm install
npm run build
npm link

cd ~/.homebridge  # oder euer Homebridge-Verzeichnis
npm link homebridge-bticino-registration
```

### Option 2: Direkt aus Ordner

```bash
cd /path/to/homebridge-bticino-registration
npm install
npm run build
```

In der Homebridge config.json den Plugin-Pfad angeben (siehe unten).

## Konfiguration

Fügt diese Platform zu eurer `config.json` hinzu:

```json
{
    "platforms": [
        {
            "platform": "BTicinoRegistration",
            "name": "BTicino Endpoint Registration",
            "bticinoIP": "192.168.178.65",
            "homebridgeIP": "192.168.178.157",
            "webhookPort": 8081,
            "interval": 4,
            "identifier": "homebridge"
        }
    ]
}
```

### Konfigurationsoptionen

| Option | Erforderlich | Standard | Beschreibung |
|--------|-------------|----------|--------------|
| `platform` | ✅ | - | Muss `BTicinoRegistration` sein |
| `name` | ✅ | - | Name für Logs |
| `bticinoIP` | ✅ | - | IP-Adresse des BTicino Intercoms |
| `homebridgeIP` | ✅ | - | IP-Adresse eures Homebridge-Servers |
| `webhookPort` | ❌ | `8081` | Port des HTTP-Servers von homebridge-camera-ffmpeg |
| `interval` | ❌ | `4` | Registrierungs-Intervall in Minuten |
| `identifier` | ❌ | `homebridge` | Identifier für die Registrierung |

## Wie es funktioniert

1. **Beim Start:** Das Plugin registriert sofort die Webhook-URLs beim BTicino c300x-controller
2. **Alle X Minuten:** Die Registrierung wird erneuert (Standard: 4 Minuten)
3. **Beim Shutdown:** Das Interval wird sauber gestoppt

Die c300x-controller Firmware löscht Endpoints nach 5 Minuten automatisch, daher die regelmäßige Erneuerung.

## Registrierte Endpoints

Das Plugin registriert drei Webhook-URLs:

| Event | URL |
|-------|-----|
| Doorbell Pressed | `http://{homebridgeIP}:{webhookPort}/doorbell?deviceName=BTicino%20Doorbell` |
| Door Locked | `http://{homebridgeIP}:{webhookPort}/locked` |
| Door Unlocked | `http://{homebridgeIP}:{webhookPort}/unlocked` |

Diese URLs werden von `homebridge-camera-ffmpeg` (mit `porthttp` aktiviert) empfangen.

## Logs

Nach dem Start solltet ihr in den Homebridge-Logs folgendes sehen:

```
[BTicino Endpoint Registration] BTicino Registration Plugin initialisiert
[BTicino Endpoint Registration] BTicino IP: 192.168.178.65
[BTicino Endpoint Registration] Homebridge IP: 192.168.178.157
[BTicino Endpoint Registration] Webhook Port: 8081
[BTicino Endpoint Registration] Registrierungs-Intervall: 4 Minuten
[BTicino Endpoint Registration] Homebridge fertig geladen, starte Endpoint-Registrierung...
[BTicino Endpoint Registration] ✓ Endpoints erfolgreich registriert bei 192.168.178.65
```

## Troubleshooting

### "Registrierung fehlgeschlagen"
- Ist der BTicino erreichbar? `ping 192.168.178.65`
- Läuft der c300x-controller? Prüft `http://192.168.178.65:8080/`

### Keine Doorbell-Events in HomeKit
- Ist `porthttp: 8081` in der camera-ffmpeg Config gesetzt?
- Firewall auf QNAP prüfen (Port 8081 muss offen sein)

## Lizenz

MIT
