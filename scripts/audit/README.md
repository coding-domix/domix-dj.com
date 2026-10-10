# Lokaler DOMIX-Audit

Diese Skripte gehören zur technischen Prüfung, nicht zur Website-Laufzeit. Die Website benötigt weiterhin keinen Build und keine npm-Pakete im Browser. Alle Befehle werden im Repository-Verzeichnis ausgeführt. Node.js 24 und ein installiertes Chrome wurden für den Audit verwendet.

## Werkzeuge vorbereiten

```powershell
npm install --prefix output/playwright/tools --cache output/playwright/npm-cache --no-audit --no-fund --save-exact playwright@1.64.0 lighthouse@13.5.0 sharp@0.35.5 pixelmatch@8.0.0 pngjs@7.0.0
$env:PLAYWRIGHT_BROWSERS_PATH="$PWD/output/playwright/browsers"
node output/playwright/tools/node_modules/playwright/cli.js install firefox webkit
node scripts/audit/snapshot-baseline.mjs
node scripts/audit/server.mjs
```

Der Server bleibt in diesem Terminal aktiv. Er bindet ausschließlich an `127.0.0.1`. Port 4173 liefert den unveränderten Ausgangscommit, Port 4174 den Arbeitsstand. Er ist ein lokales Testwerkzeug, kein Produktionsserver. Er emuliert gleiche Textkompression, Byte-Ranges und Cachezeiten für beide Stände; seine Header sind keine Hostingkonfiguration.

## Messungen und Tests

Die Testkonten, installierten Systemfonts, Browserversionen und Bildschirmbedingungen müssen für Vorher/Nachher identisch sein. Lighthouse einzeln laufen lassen, ohne gleichzeitige Browser-/Bildverarbeitungstests.

```powershell
node scripts/audit/lighthouse.mjs before
node scripts/audit/lighthouse.mjs after
```

Diese Befehle übernehmen gespeicherte Berichte mit passendem Geräteprofil und ergänzen fehlende Läufe. `--fresh` erzwingt eine neue Serie und überschreibt die betreffenden Berichte; nur verwenden, wenn tatsächlich neu gemessen werden soll. Nach Quellcodeänderungen sind ältere Nachher-Messungen nicht mehr gültig.

```powershell
node scripts/audit/browser.mjs before chromium
node scripts/audit/browser.mjs after chromium
node scripts/audit/compare.mjs chromium
```

Für Firefox/WebKit `chromium` durch `firefox` bzw. `webkit` ersetzen. `--interactions-only` am Ende beschränkt einen Lauf auf die Bedienprüfungen. Die allgemeinen Läufe prüfen Seitenbreiten, Console/Netzwerk, Screenshots und zentrale Interaktionen. Die Ausgangsversion scheitert absichtlich an Tests der später reparierten Fehler.

```powershell
node scripts/audit/regressions.mjs before
node scripts/audit/regressions.mjs after
node scripts/audit/invariants.mjs
node scripts/audit/static.mjs
node scripts/audit/report-data.mjs
```

`regressions.mjs` prüft konkrete Audio-/Galerie-/Fragmentfehler, Medienausfälle, Wiederholungen, Consent und Zoom/Touch-Emulation. `invariants.mjs` vergleicht sichtbare Inhalte und ausgewählte berechnete Styles. `compare.mjs` speichert sowohl exakte Pixeldifferenzen als auch Pixelmatch-Ergebnisse bei Schwelle 0,1. Die Ergebnisse müssen ausgewertet werden; nicht jedes Skript setzt bei einem aufgezeichneten Testfehler einen Prozess-Exitcode.

`external.mjs` prüft öffentliche Links lesend; `--retry` wiederholt nur vorher fehlgeschlagene Abfragen. `inspect.mjs` ordnet Console-Meldungen und tatsächlich verwendete Fonts zu. Diese beiden Werkzeuge sind bei Bedarf nutzbar und nicht Teil jeder Wiederholungsprüfung.

## Assetprüfung und gespeicherter Auditstand

`assets.mjs` erzeugt Kandidaten ausschließlich aus der festen Audit-Baseline und prüft dekodierte sichtbare Pixel. **`--apply` schreibt Dateien und Referenzen um.** Nicht für später ausgetauschte Benutzerbilder verwenden: Die Quelle dieses Skripts ist ausdrücklich der ursprüngliche Auditstand, nicht das jeweils neueste Bild. Original-PNGs bleiben als bestehende URLs erhalten; das Partnerlogo wird unter unverändertem PNG-Pfad verlustfrei neu kodiert.

`verify-results.mjs` validiert gezielt den abgeschlossenen Audit vom 8.–10. Oktober 2026. Es prüft 72 Berichte, die Baseline gegen Git, unveränderte Mailto-Ziele, JavaScript-Syntax und dass keine Produktionsdatei nach Beginn dieser Messserie geändert wurde. Es ist kein allgemeiner Test für spätere Website-Updates. `docs/audit-data/final-verification.json` enthält die Prüfsummen dieses Abschlussstands.

Alle großen Artefakte und lokal installierten Werkzeuge liegen im ignorierten Verzeichnis `output/playwright/`. Kompakte Auswertung und Abschlussbericht liegen in `docs/`. Keine Änderung an `CNAME` oder Produktionshosting ist erforderlich, um die Tests auszuführen.
