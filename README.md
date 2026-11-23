# ICAUR — Prototipo sito

Prototipo statico (HTML, CSS e JS vanilla, nessuna dipendenza né build) da integrare in un tema WordPress custom.

## Pagine

| File | Pagina |
|---|---|
| `index.html` | Home |
| `chi-siamo.html` | Chi siamo |
| `modello-v27.html` | Dettaglio modello V27 |
| `modello-v25.html` | Dettaglio modello V25 |

Concessionari, News e Contatti saranno realizzate direttamente in WordPress: nel menu hanno link provvisori (`#concessionari`, `#news`, `#contatti`).

## Struttura

```
assets/css/main.css   stili (design tokens in :root, poi base, layout, header, footer, componenti)
assets/js/main.js     menu mobile e sottomenu
assets/img/           immagini
```

## Note per l'integrazione

- Header e footer sono identici in tutte le pagine e delimitati da commenti `HEADER (→ header.php)` / `FOOTER (→ footer.php)`.
- Colori, font e spaziature sono variabili CSS in `:root`.
- Classi in stile BEM, indipendenti dalla pagina; `is-current` / `aria-current="page"` segnano la voce di menu attiva.

## Anteprima locale

```bash
python3 -m http.server 8080
```

Poi apri http://localhost:8080
