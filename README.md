# TacticalPad Clone

Aplicación web (HTML/CSS/JS) que replica las funciones principales de TacticalPad: pizarra táctica, formaciones, animaciones 2D, vista 3D, análisis de video, notas y exportación.

Proyecto configurado como aplicación Node con build (Vite) y servidor Express.

## Cómo ejecutar

Desarrollo (con hot reload):

```bash
pnpm install
pnpm dev
```

Luego abrir http://localhost:5173

Build de producción:

```bash
pnpm build
```

Ejecutar la app (servidor Node sirviendo el build):

```bash
pnpm start
```

Luego abrir http://localhost:5173

## Funciones

- Deporte: fútbol (pizarra con proporciones reglamentarias).
- Formaciones y animaciones con múltiples frames e interpolación.
- Jugadores arrastrables, modo rápido, balón.
- Materiales de entrenamiento: porterías, conos, chinos, escalera, picas, valla y balón para dibujar tareas.
- Dibujo libre, líneas y flechas, borrador.
- Vista 3D con Three.js.
- Análisis de video con anotaciones e marcadores.
- Notas, guardar/abrir proyecto JSON, exportar imagen/video, presentación.
- Presentación: `presentacion.html` (Reveal.js) con selector de hoja (Tareas / TacticalPad Clone).
