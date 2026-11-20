/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { self } from '$app/service-worker';
import { immutable, assets, prerendered } from '$app/manifest';
import { version } from '$app/env';

const CACHE = `pocketcue-${version}`;
const ASSETS = new Set([...immutable, ...assets, ...prerendered].map((f) => f.path));

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll([...ASSETS]))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	// Build output and static files never change within a version: serve them from the cache.
	if (ASSETS.has(url.pathname) && request.mode !== 'navigate') {
		event.respondWith(caches.match(url.pathname).then((hit) => hit ?? fetch(request)));
		return;
	}

	// Everything else (pages in particular): network first, cached copy when offline.
	event.respondWith(
		(async () => {
			try {
				const response = await fetch(request);
				if (request.mode === 'navigate' && response.ok) {
					const cache = await caches.open(CACHE);
					void cache.put(url.pathname, response.clone());
				}
				return response;
			} catch (err) {
				const cached =
					(await caches.match(url.pathname)) ??
					(request.mode === 'navigate' ? await caches.match('/') : undefined);
				if (cached) return cached;
				throw err;
			}
		})()
	);
});
