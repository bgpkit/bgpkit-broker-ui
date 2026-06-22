// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

declare global {
  // Cloudflare Workers types
  interface KVNamespace {
    get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | null>;
    put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number; expiration?: number }): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string; expiration?: number }[]; list_complete: boolean; cursor?: string }>;
  }

  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}

    // Cloudflare Workers platform interface
    // See https://kit.svelte.dev/docs/adapter-cloudflare#bindings
    interface Platform {
      env?: {
        // KV namespace for ASN cache
        ASN_CACHE?: KVNamespace;

        // Durable Objects
        // MY_DURABLE_OBJECT?: DurableObjectNamespace;

        // Add other Cloudflare bindings here as needed
      };
      context?: {
        waitUntil(promise: Promise<unknown>): void;
      };
      cf?: {
        // Cloudflare request metadata
        country?: string;
        city?: string;
        timezone?: string;
        // See https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf--connecting-ip
      };
    }
  }
}

export {};
