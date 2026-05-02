# Strategische FSM-Details

## Adaptive Laststeuerung (v1.6)
Zur Maximierung der Netto-Energie-Velocity wird die Lastgrenze (`loadLimit`) dynamisch an die Raum-Topographie angepasst:
* **Distanz-Probing**: Erfassung der Wegzeit zwischen Spawn und Quellen während der ersten Ticks.
* **Schwellenwert**: Bei einer Distanz > 10 Ticks wird die Last auf 50% gedrosselt, um Fatigue-Staus auf unbefestigtem Gelände zu verhindern.
* **Sättigung**: Sobald Roads (RCL 2) verfügbar sind, wird das Limit zugunsten des maximalen Volumens (100% Load) aufgehoben.

## Recovery-Protokoll
Sichert die funktionale Kontinuität nach einem Respawn oder massiven Creep-Verlust:
1. **Garbage Collection**: Bereinigung des `Memory.creeps` Objekts zur Vermeidung von Namenskollisionen.
2. **Default-Role**: Zuweisung der `harvester`-Rolle an alle creeps ohne definierten Status, um den Energiefluss unmittelbar zu reaktivieren.
