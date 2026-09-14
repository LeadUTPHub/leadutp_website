import { defineConfig } from 'vitest/config';

// T6.7 (Sprint 6) — el "flake" intermitente documentado en MEMORY.md
// L22/L28 se investigó a fondo y la causa real NO era una carrera de
// sesiones de Auth entre clientes concurrentes (esa hipótesis original
// ya estaba mitigada: no queda ningún `.auth.getUser()` en el repo, solo
// `getSession()`). Reproducido a propósito varias veces con la traza
// completa: el fallo real es un `Error: Test timed out in 5000ms` — los
// tests de integración contra Supabase real (rls.integration.test.ts,
// SupabaseContentRepository.{galleries,pointers,pageBlocks}.test.ts)
// hacen 2-3 llamadas de red reales seguidas dentro de un mismo test
// (crear galería → crear foto → editar foto, por ejemplo), y el default
// de Vitest (5000ms) queda ajustado cuando varios de esos archivos
// corren en paralelo compitiendo por la misma latencia de red hacia el
// mismo proyecto de Supabase. Subir el default le da margen sin
// esconder un test genuinamente colgado (15s sigue siendo un fallo
// duro, no un timeout infinito). No se aisló el paralelismo de archivos
// (`fileParallelism: false`) porque, medido, no reducía la frecuencia
// del fallo — el cuello de botella real es la latencia de red, no la
// concurrencia de procesos.
export default defineConfig({
	test: {
		testTimeout: 15000,
	},
});
