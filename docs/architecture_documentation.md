# Screeps Core Architektur: Version 1.6

## System-Übersicht
Modulare Architektur mit Fokus auf deterministischer Rollenzuweisung und CPU-Optimierung. Das System priorisiert funktionale Integrität durch Reduktion systemischer Entropie.

## Komponenten
* **Main Loop (main.js)**: Beinhaltet eine Identitäts-Sicherung (Role-Recovery) für nicht-identifizierte Creeps.
* **Cache Manager (cache.manager.js)**: Verwaltet flüchtige Heap-Daten (ephemeral) und persistente Metriken (meta). Er dient der Speicherung von Raum-Objekt-IDs zur CPU-Schonung.
* **Role Modules**: Zustandsmaschinen für spezialisierte Aufgaben (Harvester, Upgrader, Builder).
* **Strategy Manager**: Ermöglicht dynamische Skalierung basierend auf der verfügbaren Energiekapazität (energyCapacityAvailable).

## Strategische Prinzipien
* **Identitäts-Integrität**: Automatische Rollenzuweisung erfolgt sofort, falls ein Memory-Eintrag fehlt.
* **Volatile Filtering**: Die Filterung von Zuständen (z. B. Energie < Kapazität) erfolgt grundsätzlich außerhalb des Caches pro Tick.
* **Fatigue-Management**: Bau von Roads wird ab RCL 2 zur Effizienzsteigerung und Fatigue-Reduktion priorisiert.

## FSM-Zustände (Strategy)
* **Emergency**: Wiederherstellung der Basis-Population bei kritischem Creep-Mangel.
* **Stabilizing**: Sättigung der Infrastruktur (Extensions und Spawns).
* **Progressing**: Fokus auf GCL-Steigerung, Bauprojekte und Infrastrukturausbau.
