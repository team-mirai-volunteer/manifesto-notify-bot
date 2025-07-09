export const config = {
  env: (Deno.env.get('ENV') || 'local') as 'local' | 'prod',
  isProd: function (): boolean {
    return this.env === 'prod';
  },
};

export type Config = typeof config;
