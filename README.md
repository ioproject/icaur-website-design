# iCAUR Italia — Prototipo sito

Prototipo statico da integrare in un tema WordPress custom. HTML, CSS e JavaScript scritti a mano; animazioni con GSAP + ScrollTrigger e scroll fluido con Lenis (file locali in `src/assets/js/vendor/`). Nessun framework, nessun `npm install`: serve solo Python 3.

## Avvio rapido

```bash
python3 tools/build.py --watch          # genera dist/ e la rigenera a ogni modifica di src/
cd dist && python3 -m http.server 8080  # in un altro terminale → http://localhost:8080
```

## Pagine

| Pagina | Stato |
|---|---|
| `index.html` — Home | ✅ |
| `chi-siamo.html` — Chi siamo + iCAUR Life | ✅ |
| `v27.html` — V27, pagina modello completa | ✅ |
| `v25.html` — V25 coming soon | ✅ (data di lancio in `v25.launch_date`, vuota = "da annunciare") |
| `contatti.html` — Contatti con form | in lavorazione |

Concessionari e News saranno realizzate in WordPress: nel menu hanno link provvisori (`#concessionari`, `#news`).

## Struttura

```
src/
  pages/        template delle pagine
  partials/     head, header, footer, scripts (→ header.php / footer.php)
  content/      it.json (lingua principale) e en.json: TUTTI i testi del sito
  assets/
    css/        main.css (token, base, header, footer), home.css, model.css (pagine modello)
    js/         main.js (interazioni comuni), model.js (pagine modello), vendor/ — tutto attivato da attributi data-*
    fonts/      Gotham (Light, Book, Medium, Bold)
    img/ video/ immagini e video ottimizzati
tools/
  build.py      generatore: src/ → dist/ (italiano in /, inglese in /en/)
  media.py      ottimizza immagini e video da mater/ (macOS)
  video.swift   taglio/compressione video e poster con AVFoundation
dist/           output generato (non versionato)
mater/          materiale originale HQ, 8 GB (non versionato)
```

### Sintassi dei template

```
{{ home.hero.title }}                    testo dal file della lingua
{% include header %}                     partial
{% for item in home.news.items %}…{{ item.title }}…{% endfor %}
{{ @assets }}  {{ @lang }}  {{ @href_it }}  {{ @href_en }}  {{ @current:v27.html }}
```

## Note per l'integrazione in WordPress

- Header e footer sono partial separati e delimitati da commenti `HEADER (→ header.php)` / `FOOTER (→ footer.php)`.
- Ogni testo ha una chiave nei JSON: si mappano 1:1 su stringhe traducibili o campi ACF.
- Colori, font, spaziature e tempi delle animazioni sono variabili CSS in `:root` (`main.css`).
- Le interazioni si attivano con attributi `data-*` documentati in testa a `main.js`; nessuna dipendenza dall'ordine delle sezioni.
- `prefers-reduced-motion` è rispettato: niente scroll fluido né effetti forti, solo dissolvenze.
- Il nome del brand si scrive sempre **iCAUR**: dentro testi in maiuscolo va avvolto in `<span class="nocase">`.

## Rigenerare i media

```bash
python3 tools/media.py          # crea solo i file mancanti
python3 tools/media.py --force  # rigenera tutto
```

Le immagini sono JPEG responsive (q70). Per passare a WebP/AVIF basta installare `cwebp`/`avifenc` e cambiare l'encoder in `tools/media.py`.
