import type { Event } from './events.types';

// Vacío a propósito (Sprint 1 — integración con Luma, ver
// .sprints/BACKLOG.md y MEMORY.md D-P4/D-P5). Los 22 eventos que
// tenía este archivo eran de ejemplo (fechas y registrationUrl
// ficticios) y nunca fueron aptos para producción — ver el histórico
// en git antes de este commit si hace falta recuperar la estructura
// de referencia. `/eventos` ahora muestra los eventos próximos vía
// embed/link a Luma (fuente única de verdad, sin sync) y este array
// queda para "eventos destacados" que un director cargue en Sprint 3
// (punteros a Luma) — hasta entonces, vacío = estado vacío curado.
export const events: Event[] = [];
