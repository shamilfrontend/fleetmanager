/// <reference types="vite/client" />

declare namespace JSX {
	interface IntrinsicElements {
		[elem: string]: unknown
	}
}

interface ImportMetaEnv {
	readonly VITE_API_URL: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
