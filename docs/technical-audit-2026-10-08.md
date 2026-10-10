# DOMIX: Technischer Audit und Abschlussbericht

**Audit und Messungen: 8. Oktober 2026. Abschlussprüfung: 10. Oktober 2026.**

Die sicheren Optimierungen sind im Branch `codex/technical-audit-performance` umgesetzt. Die Website bleibt statisch und benötigt weiterhin keinen Build für den Betrieb. Keine Veröffentlichung und keine Änderung an DNS, Domain, Hosting oder Deployment wurden vorgenommen.

Die Ergebnisse zeigen weniger übertragene Daten und weniger Ressourcenanfragen. Die mobilen Lighthouse-Scores verbessern sich auf Home und Shows um jeweils zwei Punkte. Die Desktop-Scores bleiben auf allen sechs Seiten bei 100. Das mobile LCP-Ziel von 2,5 Sekunden wird auf Home, Shows und Contact weiterhin nicht erreicht. Nicht jede Zeitmetrik verbessert sich; die Einzelheiten stehen in Abschnitt C.

103 Vorher/Nachher-Screenshotpaare zeigen keine Unterschiede beim dokumentierten perceptuellen Vergleich. 93 Paare sind vollständig pixelidentisch. Die Aussage gilt für die geprüften Ansichten und Zustände, nicht pauschal für jedes Gerät und jeden Animationszeitpunkt.

## Ausgangsbasis und Prüfplan

- Ausgangscommit: `6429a70310dc5fc45f44be36ee5aaa1d7403b587`; sauberer Worktree, Sicherungsbranch `codex/technical-audit-performance`.
- Sechs Inhaltsseiten plus `index_mobil.html` als bestehende Weiterleitung.
- Statisches HTML, CSS und natives JavaScript; keine Frameworks, Bundler, Produktionspakete oder externen Fonts. `Inter` ist lediglich der erste Eintrag im Systemfont-Stack.
- `css/styles.css`: 204.885 Bytes, 31 Media-Query-Blöcke; `js/site.js`: 9.878 Bytes. Seitenlogik in Home, Shows und Music ist inline. Insgesamt 189.433 Bytes HTML.
- Bilder überwiegend WebP, einige PNG/JPEG/SVG; elf MP3-Dateien, keine eingebetteten Videos. Audio wird erst nach Interaktion geladen. SoundCloud wird erst nach ausdrücklichem Klick eingebettet.
- Live-HEAD/GET über HTTPS: GitHub Pages/Fastly, Gzip, `Cache-Control: max-age=600`, ETag und Byte-Ranges. Keine Hosting-Konfiguration außer `CNAME` im Repository. Keine Produktionskonfiguration wird geändert.
- Werkzeuge ausschließlich lokal unter ignoriertem `output/playwright/`: Playwright 1.64.0, Lighthouse 13.5.0, Sharp 0.35.5, Pixelmatch 8.0.0. Keine neue Browser-/Produktionsabhängigkeit.

## Priorisierung vor Implementierung

| Befund | Nutzen / Risiko | Entscheidung |
|---|---|---|
| Cache-only-Fetch für jedes Headerbild | Zusätzliche Arbeit/Anfragen, potenzielle Cache-Miss-Fehler; geringes Änderungsrisiko | Tatsächlichen Bildladezustand verwenden; Loader, Dekodierung und Animation erhalten |
| Große PNG-Dateien | Netzwerklast; verlustfreie Kodierung sicher nach Pixelprüfung | Nur kleinere Kandidaten mit identischen sichtbaren RGBA-Pixeln ausliefern |
| Unsichtbare mobile Galerie-Caption über Bildern | Blockiert Touch/Klick; keine sichtbare Änderung erforderlich | Pointer-Events auf tatsächlichen Caption-Inhalt begrenzen |
| Globales Enter/Leertaste-Handling in Galerie | Unterdrückt native Button-/Link-Aktivierung | Native Aktivierung fokussierter Bedienelemente erhalten |
| Kontakt-Link auf fehlenden Anker | Navigation endet am Seitenanfang | Korrektes vorhandenes Ziel, alten Fragmentnamen weiter unterstützen |
| Ungültig kodierte URL-Fragmente | `decodeURIComponent` kann URIError auslösen | Ungültige Fragmente kontrolliert ignorieren |
| Viele kaskadierende CSS-Regeln / große Originalbilder | Größeres Refactoring bzw. Skalierung birgt Darstellungsrisiko | Kein pauschales Entfernen, Redesign oder verlustbehaftetes Rekodieren |

## Methodik

Baseline-Kopie des Ausgangscommits auf Port 4173, Arbeitsstand auf 4174. Identischer lokaler HTTP-Server mit Gzip für Text, Byte-Ranges für Audio und 600-Sekunden-Cache. Lighthouse läuft separat von Browser-Regressionsprüfungen mit kaltem Browserprofil, drei Durchläufen pro Seite und Geräteprofil. Desktop verwendet explizit die offizielle Lighthouse-Desktop-Konfiguration. Lokale Messungen ersetzen keine Produktions- oder Felddaten.

Referenzansichten normalisieren ausschließlich im Test Scroll-Animationen und CSS-Animationen beim Screenshot; die Website selbst behält ihre Effekte. Native Lazy-Load-Bilder und Reveal-Bereiche werden durch Scrollen geladen. Die Shows-Datumslogik wird im Screenshotlauf auf den 8. Oktober 2026 fixiert.

Die letzte Messserie lief am **8. Oktober 2026 von 09:48 bis 09:57 Uhr, Europe/Vienna**. Sie wurde trotz der Unterbrechung der Unterhaltung vollständig gespeichert. Am 10. Oktober wurden alle 72 Berichte auf Vollständigkeit, gültige Metriken, gleiche Profile und fehlende Laufzeitfehler geprüft. Daher wurden keine erfolgreichen Messungen wiederholt. Sämtliche Produktionsdateien sind seit Beginn dieser Messserie unverändert.

Die anfänglichen Vergleichsläufe unter unterschiedlichen Windows-Testkonten wurden wegen abweichend verfügbarer Systemschriften nicht als abschließender visueller Vergleich verwendet. Die endgültigen Referenz- und Zielbilder stammen jeweils aus derselben Browser-/Schriftumgebung. Es wurden keine Website-Schriften verändert oder ergänzt.

## A. Technischer Zustand

### Gefundene und behobene Probleme

1. **Zusätzliche Header-Cacheabfragen:** Der Loader führte für jedes Header-Asset einen `fetch(..., {cache: 'only-if-cached'})` aus. Nun prüft er die tatsächlich verwendeten Bildobjekte und wartet weiterhin auf deren Dekodierung. Das entfernt redundante Anfragen und behält Loader-Gestaltung, Reveal-Effekte und vollständige Headerdarstellung bei. Nach Abschluss wird auch der jeweils unbenutzte `load`-/`error`-Listener entfernt.
2. **Übertragungsgröße einzelner PNGs:** Vier Assets werden als verlustfreie WebP-Dateien ausgeliefert; das Partnerlogo bleibt PNG und erhält effizientere verlustfreie Kompression. Alle ursprünglichen Dateien und URLs bleiben vorhanden. Dimensionen, Transparenz, Zuschnitt und sichtbare Pixel bleiben erhalten.
3. **Mobile Galerie:** Der unsichtbare ausgedehnte Caption-Container fing Klicks auf sichtbare Vorschaubilder ab. Pointer-Events greifen jetzt nur auf den tatsächlichen Caption-Inhalt. Positionierung und Gestaltung ändern sich nicht.
4. **Galerie-Tastatursteuerung:** Der globale Enter-/Leertaste-Handler unterdrückte die native Aktivierung fokussierter Buttons und Links. Der Schließen-Button funktioniert nun auch per Enter; die bestehenden Bildwechsel-Tasten bleiben erhalten.
5. **Veralteter Kontakt-Anker:** Der Partnerverweis führt zum vorhandenen `lange-einkaufsnacht-show`. Der historische Fragmentname `marchfelder-bank-show` wird zusätzlich weiter auf dieses Ziel abgebildet.
6. **Ungültige URL-Fragmente:** Eine fehlerhafte Prozentkodierung verursachte auf Shows einen `URIError`. Nur dieser konkrete Fehler wird jetzt kontrolliert behandelt; unerwartete Fehler werden weitergeworfen.
7. **Audio-Race-Conditions:** Ein abgebrochenes älteres `play()` konnte den Zustand des neuen Titels zurücksetzen. Außerdem konnten alte `loadedmetadata`-Handler einen inzwischen gewechselten Track erneut auswählen oder verschieben. Ein Request-Zähler pro Audioelement und höchstens ein ausstehender Seek-Handler verhindern diese konkret reproduzierten Fehler. Beide Player teilen sich die kleine Hilfslogik.
8. **Galerie-Bildquelle beim Schließen:** `src` und `srcset` werden entfernt, statt einen leeren URL-Wert zuzuweisen.

### Unverändert gebliebene Architektur und Grenzen

- Semantische Bereiche, Navigation, Seitenadressen, Überschriften, Texte, Reihenfolgen, Medien, Abmessungen und Breakpoints bleiben erhalten. Alle ursprünglichen **124 Git-Dateien** sind weiterhin vorhanden; die Baseline wurde byteweise gegen den Ausgangscommit geprüft.
- Das gemeinsame Stylesheet enthält viele absichtliche Kaskaden und mobile Überschreibungen. Regeln wurden nicht aufgrund einer einzelnen Lighthouse-Abdeckungsmessung entfernt. Hover-, Fokus-, Galerie- und andere Viewport-Zustände benötigen auch anfangs ungenutzte Regeln.
- Das Stylesheet bleibt renderblockierend. Lighthouse schätzt auf Home etwa 7 KiB Potenzial durch Minifizierung. Ein neuer dauerhafter Buildprozess nur für diese Einsparung wurde wegen Wartungsaufwand und Risiko veralteter generierter Dateien nicht eingeführt.
- Keine zusätzlichen externen Dienste oder Frontend-Bibliotheken. Die neuen Werkzeuge laufen ausschließlich beim lokalen Audit.
- Keine Mixed-Content-Referenzen, fehlenden lokalen Ziele oder unsicheren neuen `_blank`-Links im geprüften Quellcode. Dynamische Karten verwenden lokale feste Daten; der Suchtext wird nicht als HTML eingesetzt. Dies ist ein Frontend-Audit, kein Penetrationstest des Hostinganbieters.
- Systemschriften variieren weiterhin je nach Betriebssystem und lokal installierten Fonts. Das war bereits Teil der Website; eine feste Webfont würde Darstellung und Netzwerkverhalten verändern.

## B. Durchgeführte Optimierungen und Nutzen

| Asset | Vorher, Bytes | Nachher, Bytes | Einsparung, Bytes |
|---|---:|---:|---:|
| Marchfelder-Bank-Logo, PNG | 1.430.246 | 1.292.202 | 138.044 |
| Instagram-Icon, PNG → WebP | 127.850 | 41.264 | 86.586 |
| SoundCloud-Icon, PNG → WebP | 12.236 | 9.862 | 2.374 |
| Café-Opera-Cover, PNG → WebP | 1.656.003 | 1.093.748 | 562.255 |
| Where-Have-You-Been-Cover, PNG → WebP | 632.534 | 268.802 | 363.732 |
| **Summe bei Abruf aller fünf Assets** | **3.858.869** | **2.705.878** | **1.152.991** |

Die 1,15 MB Einsparung gelten nicht automatisch für jeden ersten Seitenaufruf: Lazy Loading und die jeweilige Seite bestimmen, welche Assets tatsächlich geladen werden. In den gemessenen kalten Seitenaufrufen sinkt die Übertragung je nach Seite/Profil um etwa 88–650 kB.

Vier Kandidaten liefern exakt identische dekodierte RGBA-Werte. Beim Instagram-Icon unterscheiden sich lediglich RGB-Werte vollständig transparenter Pixel; Alpha und alle sichtbaren Farbwerte sind identisch. Es wurde weder skaliert noch verlustbehaftet komprimiert. Die sichtbare Darstellung wurde zusätzlich im Browser verglichen.

Der Loader spart in den Lighthouse-Berichten drei bis neun Ressourcenanfragen pro Seitenaufruf. Darin sind auch zuvor aus dem Cache bediente Einträge enthalten: Weniger Anfragen sind nicht mit ebenso vielen vermiedenen Netzwerkübertragungen gleichzusetzen. Audio bleibt `preload="none"`; SoundCloud verbindet sich weiterhin erst nach Klick. Bestehendes Lazy Loading, Hero-Priorisierung und Animationen wurden beibehalten.

## C. Performance: Vorher und nachher

### Messbedingungen

**72 gültige Lighthouse-Berichte:** sechs Seiten × Mobile/Desktop × drei Wiederholungen × zwei Versionen. Lighthouse 13.5.0, Chrome 154, lokaler Server, identische Auslieferung und jeweils frisches Browserprofil. Mobile verwendet simuliertes Slow-4G/4-fach-CPU-Throttling; Desktop die offizielle Desktop-Konfiguration. Alle Tabellen zeigen den **Median der drei Einzelwerte**, keine ausgewählte Bestmessung.

Die Tabellen enthalten Labordaten. Es wurden keine CrUX-, Search-Console- oder anderen realen Nutzerdaten erhoben. **INP wurde nicht gemessen. TBT ist kein gemessener INP-Ersatz.** Die üblichen Core-Web-Vitals-Zielwerte beziehen sich auf Felddaten und deren Verteilung; ein Lighthouse-Lauf belegt deren Erfüllung nicht. Quellen: [Core-Web-Vitals-Grenzwerte](https://web.dev/articles/defining-core-web-vitals-thresholds), [Lighthouse-Bewertung](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring), [Messvariabilität](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md).

### Startseite im Detail

| Metrik | Vorher | Nachher |
|---|---:|---:|
| Lighthouse Mobile | 87 | 89 |
| Lighthouse Desktop | 100 | 100 |
| LCP Mobile | 4,129 s | 3,762 s |
| LCP Desktop | 0,787 s | 0,731 s |
| CLS Mobile / Desktop | 0 / 0 | 0 / 0 |
| FCP Mobile / Desktop | 0,904 / 0,244 s | 0,908 / 0,247 s |
| TBT Mobile / Desktop | 0 / 0 ms | 0 / 0 ms |
| Speed Index Mobile / Desktop | 1,146 / 0,442 s | 1,436 / 0,429 s |
| Übertragene Bytes Mobile / Desktop | 1.216.863 / 2.724.904 | 1.128.350 / 2.498.347 |
| Ressourcenanfragen Mobile / Desktop | 33 / 36 | 24 / 27 |
| INP / echte Nutzerdaten | Nicht erhoben | Nicht erhoben |

### Alle Seiten – Mobile

Jede Zelle zeigt **Vorher → Nachher**. Zeiten in Sekunden; Datenmenge in dezimalen kB. **CLS und TBT bleiben in sämtlichen folgenden Medianwerten bei 0.**

| Seite | Score | LCP | FCP | Speed Index | kB übertragen | Anfragen |
|---|---:|---:|---:|---:|---:|---:|
| Home | 87 → 89 | 4,129 → 3,762 | 0,904 → 0,908 | 1,146 → 1,436 | 1.216,9 → 1.128,4 | 33 → 24 |
| Shows | 89 → 91 | 3,754 → 3,531 | 1,054 → 0,906 | 1,054 → 0,906 | 1.050,7 → 962,4 | 22 → 18 |
| Music | 99 → 99 | 2,104 → 2,104 | 1,054 → 1,054 | 1,054 → 1,054 | 451,9 → 363,8 | 16 → 12 |
| About | 99 → 99 | 2,104 → 2,104 | 0,904 → 0,904 | 0,913 → 0,904 | 462,1 → 373,5 | 15 → 12 |
| Contact | 96 → 96 | 2,705 → 2,707 | 0,905 → 0,907 | 0,905 → 0,995 | 1.067,6 → 979,1 | 25 → 21 |
| Legal & Privacy | 99 → 100 | 2,255 → 1,359 | 1,053 → 1,058 | 1,053 → 1,058 | 292,7 → 204,2 | 15 → 11 |

### Alle Seiten – Desktop

| Seite | Score | LCP | FCP | Speed Index | kB übertragen | Anfragen |
|---|---:|---:|---:|---:|---:|---:|
| Home | 100 → 100 | 0,787 → 0,731 | 0,244 → 0,247 | 0,442 → 0,429 | 2.724,9 → 2.498,3 | 36 → 27 |
| Shows | 100 → 100 | 0,724 → 0,727 | 0,244 → 0,247 | 0,325 → 0,398 | 2.481,1 → 2.254,8 | 24 → 19 |
| Music | 100 → 100 | 0,550 → 0,551 | 0,250 → 0,251 | 0,356 → 0,310 | 3.561,0 → 2.910,6 | 24 → 20 |
| About | 100 → 100 | 0,464 → 0,469 | 0,244 → 0,249 | 0,319 → 0,398 | 566,5 → 478,0 | 16 → 13 |
| Contact | 100 → 100 | 0,564 → 0,566 | 0,244 → 0,246 | 0,305 → 0,318 | 1.067,6 → 979,1 | 25 → 21 |
| Legal & Privacy | 100 → 100 | 0,325 → 0,490 | 0,245 → 0,247 | 0,261 → 0,257 | 292,7 → 204,2 | 15 → 11 |

### Einordnung und verbleibende Ziele

- **Nachweisbarer Nutzen:** weniger Bytes auf jeder Seite, weniger Ressourcenanfragen auf jeder Seite; Home-LCP mobil etwa 367 ms kürzer, Shows-LCP etwa 224 ms kürzer.
- **Keine pauschale Beschleunigung aller Metriken:** Home-Speed-Index mobil steigt im Median um 290 ms; einzelne weitere Speed-Index-Werte steigen ebenfalls. Das wird nicht als Verbesserung ausgewiesen. Die drei Home-Nachherwerte liegen bei 1,216–1,466 s, die Vorherwerte bei 1,143–1,210 s. Drei Läufe erlauben keine belastbare kausale Trennung von Rendering-/Loader-Timing und Messvariabilität.
- **Legal-Desktop-LCP:** Der Median steigt von 325 auf 490 ms. Beide Versionen zeigen bereits in den Einzelmessungen die zwei Bereiche von etwa 325 bzw. 485–490 ms. Ein allgemeiner LCP-Gewinn wird für diese Seite deshalb nicht behauptet; ihr Score bleibt 100.
- **LCP ≤ 2,5 s:** im mobilen Labormedian auf Home, Shows und Contact weiterhin verfehlt. Der bildabhängige Loader, Bilddekodierung und das bestehende Rendering bleiben relevant. Entfernen des Loaders, andere Bilddimensionen oder deutliche Änderungen am kritischen CSS-Pfad wurden nicht zur Erzwingung eines Scores vorgenommen.
- **CLS ≤ 0,1:** in den gemessenen Navigationsläufen eingehalten. Das deckt nicht jeden möglichen späteren Interaktionsablauf ab.
- **INP ≤ 200 ms:** mangels geeigneter Felddaten nicht beurteilbar. Die durchgeführten Interaktionstests bestätigen Funktion, keinen INP-Wert.
- Langsame Verbindung zusätzlich funktional geprüft: 150 ms Latenz, 200.000 Byte/s Download. Kalter und warmer Aufruf sowie fehlerhaftes Hero-Bild lösen den Loader korrekt. Diese einzelnen Funktionstest-Zeiten sind keine zusätzliche Performance-Messserie.

## D. Browser-Konsole und Netzwerk

| Befund | Vorher | Nachher / Bewertung |
|---|---|---|
| Eigene JavaScript-Exceptions beim regulären Seiten-/Bedienablauf | Keine beobachtet | Keine beobachtet |
| Ungültiges Shows-Fragment | Ein reproduzierbarer `URIError` | Behoben, gezielter Test bestanden |
| Chromium-Favicon-Anfrage | `favicon.ico`: HTTP 404 | Besteht weiter; drei protokollierte Meldungen pro umfassendem Chromium-Lauf aus getrennten Kontexten, eine eindeutige Ursache |
| Lokale Ressourcen und interne Anker | Ein fehlender Kontakt-Anker | 221 statisch geprüfte Referenzen ohne fehlendes Ziel; 70 Galeriequellen erfolgreich dekodiert |
| Firefox-Audio-Netzwerkereignis | Zweimal `NS_ERROR_PARSED_DATA_CACHED` | Gleiches Ereignis beim Wiedergabe-/Quellenwechsel; keine Console-Exception, Audio-Tests erfolgreich |
| Externe Ziele | 49 öffentliche URLs geprüft | Alle nach Wiederholung vorübergehender Netzfehler HTTP 200; kein Nachweis der gesamten Funktion der fremden Seiten |

Das Favicon wurde bewusst nicht durch ein neu gewähltes Icon ersetzt: Das würde die sichtbare Tab-Darstellung verändern. Es wurde auch keine Fehlermeldung unterdrückt. Damit wird **keine vollständig fehlerfreie Browser-Konsole** behauptet.

Der SoundCloud-Test bestätigt: keine Drittanbieteranfrage vor dem Klick, anschließend genau ein Player-Iframe. Die vollständige fremde Player-Oberfläche, dauerhafte Verfügbarkeit und alle SoundCloud-internen Medienanfragen wurden nicht end-to-end verifiziert. Es wurden keine eigenen Fehler auf Drittanbieter umetikettiert.

Lighthouse meldet außerdem deaktivierten Back/Forward-Cache durch Browser-Startflags der Testumgebung. Das ist kein nachgewiesener Fehler der Website. Eine reale BFCache-Wiederherstellung wird durch diese Läufe nicht bestätigt.

## E. Responsiveness und Funktionstests

| Browser | Version | Seiten-/Viewport-Kombinationen nach Optimierung | Bedienprüfungen |
|---|---|---:|---:|
| Chromium / Chrome | 154.0.8037.98 | 66 | 16/16 bestanden |
| Firefox | 157.0 | 12 | 16/16 bestanden |
| WebKit | 27.2 | 12 | 16/16 bestanden |

Chromium-Breiten: **320, 375, 390, 430, 768, 844, 1024, 1280, 1440, 1920 und 2560 px**. Der 844-px-Lauf verwendet 390 px Höhe und deckt ein Querformat ab. Firefox und WebKit: 390 und 1440 px. Pixelverhältnisse 1 und 2 wurden eingesetzt. Kein horizontaler Dokument-Overflow in den 90 geprüften Kombinationen.

Geprüft wurden Navigation und Neuladen, die alte Mobile-Weiterleitung einschließlich Query/Fragment, Shows ein-/ausklappen, Galerie öffnen, Vorschauen und Pfeiltasten, Escape/Schließen per Tastatur, Musiksuche einschließlich Leerzustand, alle Remixes ein-/ausblenden, beide Audioplayer mit Play/Pause/Seek und gegenseitigem Stoppen. Die Website hat kein separates Hamburger-Menü; die vorhandene mobile Navigation wurde geprüft.

**13/13 zusätzliche Chromium-Regressionsprüfungen bestanden**, darunter die sechs zuvor reproduzierten Fehlerfälle: ungültiges Fragment, historischer Anker, Schließen per Enter, blockierte mobile Vorschau sowie zwei Audio-Race-Conditions. Hinzu kommen alle Galeriebilder, langsames/erneutes Laden, Medienfehler, SoundCloud-Freigabe, synthetischer Touch-Swipe und Seitenskalierung 2.

Nach 40 Such-/Rücksetzzyklen bleiben nach Garbage Collection **855 DOM-Knoten und 33 Event-Listener** bestehen; es wurde keine fortlaufende Anhäufung festgestellt. Das ist ein begrenzter Belastungstest, kein Beweis vollständiger Speicherleckfreiheit bei beliebig langer Nutzung.

**Grenzen:** keine physischen Smartphones/Tablets, kein echtes iOS-Safari-Gerät, keine Prüfung aller Pixeldichten oder Bildschirmseitenverhältnisse. Die Skalierung um Faktor 2 wurde über Chromium-Emulation geprüft; sämtliche OS-/Browser-Zoomkombinationen sind nicht abgedeckt. Kontakt-Mailto-Ziele inklusive Queryparametern wurden unverändert verglichen, aber kein Mailclient gestartet und keine Nachricht versendet. MP3-Wiedergabe wurde technisch geprüft, nicht klanglich beurteilt.

## F. Visuelle Bestandssicherung

| Vergleich | Screenshotpaare | Exakt pixelidentisch | Ohne Unterschied bei Pixelmatch-Schwelle 0,1 |
|---|---:|---:|---:|
| Chromium | 35 | 28 | 35 |
| Firefox | 34 | 32 | 34 |
| WebKit | 34 | 33 | 34 |
| **Gesamt** | **103** | **93** | **103** |

Verglichen wurden Hero und gesamte Seiten bei 390/1440 px, ausgeklappte Shows/Remixes, Such-Leerzustände, geöffnete Galerie mit Vorschauwechsel sowie Desktop-Navigation im Hover-Zustand. Lazy-Load-Inhalte wurden für Ganzseitenbilder durch Scrollen geladen. Animationen wurden nur beim Aufnehmen normalisiert. Pixelmatch verwendet Schwelle 0,1 und `includeAA: false`, berücksichtigt also erkannte Kantenglättungsunterschiede nicht als Regression. Der separate exakte Pixelvergleich ignoriert solche Unterschiede nicht. Nicht jeder einzelne Filmframe einer Animation oder jeder Hover-Zustand jedes Elements wurde verglichen.

Die übrigen zehn Bildpaare enthalten kleine numerische Rasterunterschiede. Beispielsweise liegen die geänderten Farbkanäle der ausgeklappten Shows im Mittel etwa eine Stufe auseinander; der dokumentierte perceptuelle Vergleich meldet keine abweichenden Pixel. Deshalb lautet das Ergebnis **keine erkannte sichtbare Regression in den geprüften Ansichten**, nicht „jedes Pixel ist überall identisch“.

Zusätzlich bestehen alle sechs DOM-Invariantenvergleiche: sichtbare Textknoten, Bild-Alttexte und -abmessungen, Schriftdefinitionen, Farben, Abstände und Linkziele stimmen überein. Der beabsichtigt reparierte Anker wird dabei explizit auf sein neues korrektes Ziel normalisiert. Git-Diff und Pixelvergleich bestätigen, dass weder Texte noch Layout- oder Animationsdefinitionen geändert wurden; die einzigen CSS-Änderungen betreffen Assetpfade und die unsichtbare Klickfläche.

## G. Weitere Empfehlungen und bewusst offene Punkte

1. **Reale Performance nach einer gesonderten Veröffentlichung prüfen:** mobile Home-/Shows-/Contact-LCP und INP über geeignete Felddaten beurteilen. Die lokale Optimierung wurde nicht produktiv veröffentlicht.
2. **Bildvarianten separat freigeben und visuell testen:** Besonders das 21.072 × 3.150 px große Partnerlogo benötigt viel Dekodierspeicher. Die Kompression reduziert Bytes, nicht seine Pixelzahl. Kleinere Auslieferungsvarianten könnten viel sparen, würden aber Sampling/Pixelwerte ändern und wurden deshalb in diesem Auftrag nicht erzeugt.
3. **Ladepfad gezielt weiter untersuchen:** Priorisierung und Loader-Abhängigkeiten unter realer Mobilverbindung profilieren. Eine geänderte Loader-Animation oder vorzeitige Anzeige unvollständiger Header wäre eine UX-Änderung und wurde nicht eingesetzt.
4. **CSS-Auslieferung erst mit klarem Wartungsprozess ändern:** Minifizierung oder eine Seitenteilung kann Übertragung reduzieren. Pauschales Entfernen vermeintlich unbenutzter Regeln gefährdet die zahlreichen Zustände und Breakpoints. Kein neues Framework ist dafür erforderlich.
5. **Favicon und Barrierefreiheit benötigen teilweise visuelle Entscheidungen:** Lighthouse meldet bestehende Kontrastprobleme und kleine Galerie-Zielgrößen. Farben, Abstände und Zielgrößen wurden gemäß Auftrag nicht angepasst. Automatische Accessibility-Scores nachher: Home 95, Shows 90, Music 97, About 96, Contact 96, Legal 95; dies ist keine vollständige Accessibility-Zertifizierung.
6. **Hostingmaßnahmen nur separat:** Längere Cachezeiten mit Versionskennzeichnung könnten Wiederbesuche verbessern. GitHub-Pages-Header wurden nur gelesen; zusätzliche CSP-/Caching-/DNS-Konfigurationen wurden nicht eingeführt. Der rechtliche Website-Text wurde weder fachlich bewertet noch verändert.

## Abschlussprüfung und Nachvollziehbarkeit

- Vollständiger Produktions-Diff auf versehentliche Inhalts-, Layout- und Funktionsänderungen geprüft. Die Audio-Hilfsfunktionen dienen zwei nachgewiesenen Race Conditions; keine neue Player-Architektur und kein Refactoring aus Stilgründen.
- Alle 72 Lighthouse-Berichte gültig, keine Runtime Errors oder Run Warnings; gleiches Geräteprofil und Throttling pro Vergleich.
- Baseline byteweise gegen Commit geprüft, alle ursprünglichen Pfade vorhanden, SHA-256-Manifest des finalen Produktionsstands erstellt.
- Inline-JavaScript und gemeinsames Script erfolgreich geparst, Mailto-Ziele inklusive Queryparametern unverändert, `git diff --check` erfolgreich.
- Erfolgreiche Browser- und Screenshotprüfungen bei der Fortsetzung am 10. Oktober nicht erneut ausgeführt. Der unveränderte Produktionsstand wurde stattdessen anhand Dateien, Zeitstempeln und der gespeicherten Ergebnisse bestätigt.
- Audit-Skripte, Rohbilder und Toolpakete werden nicht in die Website eingebunden. Die umfangreichen lokalen Dateien unter `output/playwright/` sind ignoriert; die kompakte Auswertung bleibt im Repository.

**Artefakte:** [Messwert- und Testzusammenfassung](audit-data/2026-10-08.json), [Abschlussvalidierung und Prüfsummen](audit-data/final-verification.json), [Reproduktionsanleitung](../scripts/audit/README.md). Vollständige Lighthouse-JSONs, Browserprotokolle, Referenzbilder und Differenzbilder befinden sich lokal unter `output/playwright/`.
