import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Integración real contra Supabase (T2.6). No usa mocks: se autentica
// de verdad con los 3 usuarios de prueba y prueba la RLS tal como la
// aplica Postgres, no como la interpretamos nosotros.
//
// `vitest run` no carga .env por su cuenta (no hay vitest.config.ts
// con getViteConfig) — se carga acá con el loader nativo de Node.
try {
	process.loadEnvFile();
} catch {
	// Sin .env (CI, otra máquina): las variables de test van a faltar
	// y el describe.skipIf de abajo salta la suite entera.
}

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const CREDS = {
	superAdmin: {
		email: process.env.TEST_SUPER_ADMIN_EMAIL,
		password: process.env.TEST_SUPER_ADMIN_PASSWORD,
	},
	director: {
		email: process.env.TEST_DIRECTOR_EMAIL,
		password: process.env.TEST_DIRECTOR_PASSWORD,
	},
	subdirector: {
		email: process.env.TEST_SUBDIRECTOR_EMAIL,
		password: process.env.TEST_SUBDIRECTOR_PASSWORD,
	},
};

const HAS_CREDENTIALS = Boolean(
	SUPABASE_URL &&
		SUPABASE_PUBLISHABLE_KEY &&
		CREDS.superAdmin.email &&
		CREDS.superAdmin.password &&
		CREDS.director.email &&
		CREDS.director.password &&
		CREDS.subdirector.email &&
		CREDS.subdirector.password,
);

async function signInAs(email: string, password: string) {
	const client = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);
	const { error } = await client.auth.signInWithPassword({ email, password });
	if (error) {
		throw new Error(`No se pudo autenticar ${email}: ${error.message}`);
	}
	return client;
}

describe.skipIf(!HAS_CREDENTIALS)(
	'RLS de luma_event_pointers cumple la matriz de DOMAIN.md (T2.6)',
	() => {
		// area de los 3 usuarios de prueba (ver MEMORY.md / mensaje del PO)
		const AREA = 'liderazgo';
		const OTHER_AREA = 'desarrollo-profesional';
		const testUrl = (suffix: string) =>
			`https://luma.com/test-rls-${Date.now()}-${suffix}`;

		let superAdmin: Awaited<ReturnType<typeof signInAs>>;
		let director: Awaited<ReturnType<typeof signInAs>>;
		let subdirector: Awaited<ReturnType<typeof signInAs>>;

		let directorId: string;
		let subdirectorId: string;

		// IDs de las 3 filas de prueba, creadas y borradas en este mismo
		// archivo — no quedan datos huérfanos en el proyecto real.
		let rowOwnedByDirector: string;
		let rowOwnedBySubdirector: string;
		let rowInOtherArea: string;
		let rowCreatedByDirector: string | undefined;

		beforeAll(async () => {
			superAdmin = await signInAs(
				CREDS.superAdmin.email!,
				CREDS.superAdmin.password!,
			);
			director = await signInAs(
				CREDS.director.email!,
				CREDS.director.password!,
			);
			subdirector = await signInAs(
				CREDS.subdirector.email!,
				CREDS.subdirector.password!,
			);

			// El super_admin ve todos los perfiles: se usan sus IDs reales
			// como owner_id de las filas de prueba (la FK lo exige).
			const { data: profiles, error } = await superAdmin
				.from('profiles')
				.select('id, role, area_slug')
				.in('role', ['director', 'subdirector']);
			if (error) throw error;

			const directorProfile = profiles?.find(
				(p) => p.role === 'director' && p.area_slug === AREA,
			);
			const subdirectorProfile = profiles?.find(
				(p) => p.role === 'subdirector' && p.area_slug === AREA,
			);
			if (!directorProfile || !subdirectorProfile) {
				throw new Error(
					`No se encontró el director/subdirector de '${AREA}' en profiles. ` +
						'Confirmá que los 3 usuarios de prueba están seedeados como se documentó.',
				);
			}
			directorId = directorProfile.id;
			subdirectorId = subdirectorProfile.id;

			// Filas sembradas por el super_admin (puede insertar en cualquier
			// área/owner): una "del director", una "del subdirector", y una
			// de otra área — para probar las 3 fronteras de la matriz.
			const { data: inserted, error: insertError } = await superAdmin
				.from('luma_event_pointers')
				.insert([
					{
						title: 'RLS test — fila del director',
						luma_url: testUrl('director'),
						area_slug: AREA,
						owner_id: directorId,
					},
					{
						title: 'RLS test — fila del subdirector',
						luma_url: testUrl('subdirector'),
						area_slug: AREA,
						owner_id: subdirectorId,
					},
					{
						title: 'RLS test — fila de otra área',
						luma_url: testUrl('otra-area'),
						area_slug: OTHER_AREA,
						owner_id: directorId, // el owner no importa para este caso
					},
				])
				.select('id, title');
			if (insertError) throw insertError;

			rowOwnedByDirector = inserted!.find((r) =>
				r.title.includes('director'),
			)!.id;
			rowOwnedBySubdirector = inserted!.find((r) =>
				r.title.includes('subdirector'),
			)!.id;
			rowInOtherArea = inserted!.find((r) =>
				r.title.includes('otra área'),
			)!.id;
		});

		afterAll(async () => {
			// Limpieza: nada de esto debe sobrevivir al test, corra en verde
			// o falle a mitad de camino.
			const ids = [
				rowOwnedByDirector,
				rowOwnedBySubdirector,
				rowInOtherArea,
				rowCreatedByDirector,
			].filter((id): id is string => Boolean(id));
			if (ids.length > 0) {
				await superAdmin.from('luma_event_pointers').delete().in('id', ids);
			}
			await Promise.all([
				superAdmin.auth.signOut(),
				director.auth.signOut(),
				subdirector.auth.signOut(),
			]);
		});

		it('director puede editar la fila del subdirector (misma área)', async () => {
			const { data } = await director
				.from('luma_event_pointers')
				.update({ title: 'editado por director' })
				.eq('id', rowOwnedBySubdirector)
				.select();

			expect(data).toHaveLength(1);
		});

		it('director NO puede editar una fila de otra área', async () => {
			const { data } = await director
				.from('luma_event_pointers')
				.update({ title: 'director intenta otra área' })
				.eq('id', rowInOtherArea)
				.select();

			expect(data).toHaveLength(0);
		});

		it('subdirector puede editar su propia fila', async () => {
			const { data } = await subdirector
				.from('luma_event_pointers')
				.update({ title: 'editado por subdirector' })
				.eq('id', rowOwnedBySubdirector)
				.select();

			expect(data).toHaveLength(1);
		});

		it('subdirector NO puede editar la fila del director (misma área)', async () => {
			const { data } = await subdirector
				.from('luma_event_pointers')
				.update({ title: 'subdirector intenta editar al director' })
				.eq('id', rowOwnedByDirector)
				.select();

			expect(data).toHaveLength(0);
		});

		it('subdirector NO puede editar una fila de otra área', async () => {
			const { data } = await subdirector
				.from('luma_event_pointers')
				.update({ title: 'subdirector intenta otra área' })
				.eq('id', rowInOtherArea)
				.select();

			expect(data).toHaveLength(0);
		});

		it('super_admin puede editar cualquier fila, de cualquier área', async () => {
			const { data } = await superAdmin
				.from('luma_event_pointers')
				.update({ title: 'editado por super_admin' })
				.eq('id', rowInOtherArea)
				.select();

			expect(data).toHaveLength(1);
		});

		it('director puede crear una fila en su propia área', async () => {
			const { data, error } = await director
				.from('luma_event_pointers')
				.insert({
					title: 'RLS test — creada por director',
					luma_url: testUrl('director-insert'),
					area_slug: AREA,
					owner_id: directorId,
				})
				.select();

			expect(error).toBeNull();
			expect(data).toHaveLength(1);

			// Fila aparte de rowOwnedByDirector — se suma a la limpieza de
			// afterAll sin pisar la que usan los tests anteriores.
			rowCreatedByDirector = data?.[0]?.id;
		});
	},
);
