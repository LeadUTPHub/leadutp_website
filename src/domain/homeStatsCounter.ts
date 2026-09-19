/**
 * Lógica PURA del contador animado de estadísticas del Home (Tarea 1.2).
 *
 * Regla inquebrantable 3 (AGENTS.md): el dominio no importa librerías,
 * frameworks ni SDKs. Por eso aquí NO vive nada de `motion`, del DOM ni de
 * `requestAnimationFrame`: solo el cálculo de qué texto mostrar para un
 * progreso dado y la curva de easing. La animación (leer el progreso del
 * tiempo, pintar el DOM) se conecta después en el <script> del componente
 * `.astro` (Tarea 1.3), que es quien sí puede tocar esas capas.
 *
 * `Intl.NumberFormat` es un global estándar de la plataforma (no un import
 * de otra capa), así que su uso respeta `purity.test.ts`.
 */

export interface CountFormatOptions {
	/** Valor final del contador (entero). */
	target: number;
	/** Texto opcional antepuesto al número (p. ej. "+", "$"). */
	prefix?: string;
	/** Texto opcional pospuesto al número (p. ej. "+", "%"). */
	suffix?: string;
}

/** Acota un número al rango [0, 1]. Un valor no finito cae a 0. */
function clamp01(value: number): number {
	if (!Number.isFinite(value)) return 0;
	if (value < 0) return 0;
	if (value > 1) return 1;
	return value;
}

/**
 * Texto a mostrar para un `progress` dado (0 → inicio, 1 → valor final).
 *
 * - `progress = 1` devuelve EXACTAMENTE el `target` (redondeo estable: el
 *   target es entero y `Math.round(1 * target) === target`), sin decimales
 *   sueltos ni errores de coma flotante.
 * - `progress = 0` devuelve `0`.
 * - `progress` fuera de [0, 1] se acota; nunca lanza excepción.
 * - Valores >= 1000 llevan separador de miles en formato es-PE.
 */
export function formatCountValue(
	progress: number,
	options: CountFormatOptions,
): string {
	const { target, prefix = '', suffix = '' } = options;
	const value = Math.round(clamp01(progress) * target);
	const formatted = new Intl.NumberFormat('es-PE').format(value);
	return `${prefix}${formatted}${suffix}`;
}

/**
 * Easing cúbico de salida: rápido al inicio, suave al final, para que el
 * conteo no sea lineal. `easeOutCubic(0) === 0` y `easeOutCubic(1) === 1`.
 * El input se acota a [0, 1] para robustez (el progreso vive en ese rango).
 */
export function easeOutCubic(t: number): number {
	const clamped = clamp01(t);
	return 1 - Math.pow(1 - clamped, 3);
}
