/**
 * Conversión entre el valor de un `<input type="datetime-local">` (hora
 * de pared, sin zona) y el instante ISO que se guarda en Supabase, con
 * `America/Lima` como zona fija de referencia.
 *
 * POR QUÉ EXISTE (defecto B del BUG 2, Sprint 6): el script del panel
 * hacía `new Date(valorDelInput).toISOString()`, que interpreta ese
 * string en la zona horaria DEL NAVEGADOR del director. La tarjeta
 * pública, en cambio, formatea con `timeZone: 'America/Lima'` fijo
 * (`EventPointerCard.astro`). Las dos coinciden únicamente mientras la
 * máquina del director esté en UTC−5: hoy calza por coincidencia de
 * offset, no por diseño. Con la zona del sistema mal puesta, o cargando
 * un evento desde el extranjero, el director tipea 18:00 y el sitio
 * publica otra hora, sin que nada avise.
 *
 * Fijar la interpretación acá hace que la hora guardada dependa solo de
 * lo que el director escribió, nunca de la máquina desde la que lo hizo.
 *
 * SOBRE EL OFFSET FIJO: Perú no aplica horario de verano — el último
 * intento fue en 1994 y se descartó. Por eso `America/Lima` es UTC−5
 * todo el año y un offset constante es correcto, no una simplificación.
 * Si algún día eso cambiara (o si se sumara un capítulo en otra zona),
 * este módulo es el único lugar a tocar, y sus tests fijan el contrato.
 *
 * Dominio puro: sin imports de Astro/Supabase y sin usar NUNCA getters
 * locales (`getHours`, `getFullYear`, ...) — solo `Date.UTC` y `getUTC*`,
 * así el resultado es idéntico corra donde corra.
 */

const LIMA_UTC_OFFSET_HOURS = -5;
const MS_PER_HOUR = 60 * 60 * 1000;

/** `2026-12-20T18:00` o `2026-12-20T18:00:30` — lo que emite el input. */
const DATETIME_LOCAL_PATTERN =
	/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

/**
 * Valor del `datetime-local` → instante ISO en UTC, leyendo el valor como
 * hora de Lima. Devuelve `null` si el formato no corresponde o si la
 * fecha no existe en el calendario (30 de febrero, mes 13, ...), en vez
 * de normalizarla en silencio como hace `Date.UTC` por su cuenta.
 */
export function datetimeLocalToIso(local: string): string | null {
	const match = DATETIME_LOCAL_PATTERN.exec(local);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const hour = Number(match[4]);
	const minute = Number(match[5]);
	const second = match[6] === undefined ? 0 : Number(match[6]);

	if (hour > 23 || minute > 59 || second > 59) return null;

	// Se arma primero la hora de pared como si fuera UTC, solo para poder
	// validarla: `Date.UTC` acepta 2026-02-30 y lo corre al 2 de marzo, así
	// que la única forma de detectar una fecha inexistente es comparar los
	// componentes de vuelta.
	const wall = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
	if (
		wall.getUTCFullYear() !== year ||
		wall.getUTCMonth() !== month - 1 ||
		wall.getUTCDate() !== day
	) {
		return null;
	}

	// Lima es UTC−5, así que el instante real es la hora de pared + 5h.
	return new Date(
		wall.getTime() - LIMA_UTC_OFFSET_HOURS * MS_PER_HOUR,
	).toISOString();
}

/**
 * Instante ISO guardado → valor para el `datetime-local`, en hora de
 * Lima. Es el inverso exacto de `datetimeLocalToIso`, de modo que abrir
 * "Editar" muestra la misma hora que el director escribió y la misma que
 * ve el visitante en la tarjeta pública. `''` si no hay fecha o no se
 * puede parsear — el input queda vacío en vez de mostrar "NaN".
 */
export function isoToDatetimeLocal(iso: string | null): string {
	if (!iso) return '';
	const ms = Date.parse(iso);
	if (Number.isNaN(ms)) return '';

	const wall = new Date(ms + LIMA_UTC_OFFSET_HOURS * MS_PER_HOUR);
	return (
		`${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}` +
		`T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}`
	);
}
