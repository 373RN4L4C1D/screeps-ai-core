# Screeps Core Architektur: Version 1.6

## System-Übersicht
[cite_start]Modulare Architektur mit Fokus auf deterministischer Rollenzuweisung und CPU-Optimierung[cite: 1]. [cite_start]Ziel: Funktionsintegrität komplexer Architekturen durch Maximierung der Signal-Rausch-Dichte[cite: 1].

## Komponenten
* [cite_start]**Main Loop (main.js)**: Beinhaltet eine Identitäts-Sicherung (Role-Recovery) für nicht-identifizierte Creeps[cite: 2, 4].
* [cite_start]**Cache Manager (cache.manager.js)**: Verwaltet flüchtige Heap-Daten (ephemeral) und persistente Metriken (meta)[cite: 7]. [cite_start]Persistente Speicherung von Raum-Objekt-IDs zur Reduktion von API-Calls[cite: 2, 8].
* [cite_start]**Role Modules**: Zustandsmaschinen (FSM) für spezialisierte Aufgaben[cite: 3].
* [cite_start]**Strategy Manager**: Dynamische Skalierung basierend auf der verfügbaren Raumkapazität (`energyCapacityAvailable`)[cite: 3].

## Strategische Prinzipien
* [cite_start]**Identitäts-Integrität**: Automatische Rollenzuweisung bei fehlendem Memory-Eintrag zur Vermeidung von Leerlauf[cite: 4].
* [cite_start]**Volatile Filtering**: Filterung dynamischer Zustände (z. B. Energie < Kapazität) erfolgt grundsätzlich außerhalb des Caches pro Tick[cite: 4].
* [cite_start]**Fatigue-Management**: Priorisierung des Straßenbaus ab RCL 2 zur Effizienzsteigerung durch Fatigue-Reduktion[cite: 5].

## FSM-Zustände (Strategy)
* [cite_start]**Emergency**: Wiederherstellung der Basis-Population[cite: 6].
* [cite_start]**Stabilizing**: Sättigung der Infrastruktur (Extensions/Spawn)[cite: 6].
* [cite_start]**Progressing**: Fokus auf GCL-Progression und großflächige Bauprojekte[cite: 6].
