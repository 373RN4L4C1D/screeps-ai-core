Screeps Core Architektur: Version 1.4

System-Übersicht

Modulare Architektur mit Fokus auf deterministischer Rollenzuweisung und CPU-Optimierung.

Komponenten

Main Loop (main.js): Beinhaltet Identitäts-Sicherung (Role-Recovery).

Cache Manager (cache.manager.js): Persistente Speicherung von Raum-Objekt-IDs.

Role Modules: Zustandsmaschinen für spezialisierte Aufgaben.

Strategy Manager: Dynamische Skalierung basierend auf energyCapacityAvailable.

Strategische Prinzipien

Identitäts-Integrität: Automatische Rollenzuweisung bei fehlendem Memory-Eintrag.

Volatile Filtering: Zustandsvalidierung erfolgt pro Tick außerhalb des Caches.

Fatigue-Management: Algorithmische Minimierung von Bewegungsverzögerungen.

Fatigue-Mechanik & Optimierung

Kalkulation

Fatigue wird pro Tick generiert: (Gewicht * Terrain-Faktor).

Gewicht: Anzahl der Body-Parts ohne MOVE.

Terrain-Faktor: Road (1), Plain (2), Swamp (10).

Reduktion: Jeder MOVE-Part baut 2 Fatigue-Punkte pro Tick ab.

Gegenmaßnahmen

Body-Ratio 1:1: Für 100% Velocity auf Plains muss die Anzahl der MOVE-Parts der Summe aller anderen Parts entsprechen.

Straßenbau: Reduktion des Terrain-Faktors auf 1 halbiert die Fatigue-Last und ermöglicht 1:1 Bewegung selbst bei einem 1:2 MOVE-Verhältnis.

Pfad-Priorisierung: PathFinder-Kosten für Swamps auf maximalen Wert setzen, um Umwege über Plains/Roads zu erzwingen.

Vorbeugung

Spezialisierte Bodies: Trennung in stationäre Worker (wenig MOVE) und Transporter (viel MOVE).

Empty-Carry-Bonus: Creeps ohne Inhalt generieren weniger Fatigue durch leere CARRY-Parts (Gewicht reduziert).

FSM-Zustände (Strategy)

Emergency: Wiederherstellung der Basis-Population.

Stabilizing: Sättigung der Infrastruktur.

Progressing: Fokus auf GCL, Bauprojekte und Fatigue-Infrastruktur (Roads).
