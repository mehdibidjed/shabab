// Locale and demo user come from cookies on every request, so the prototype
// renders dynamically; cacheComponents/partial prefetching are left off.
//
// next-intl: we declare the `next-intl/config` alias ourselves instead of using
// `createNextIntlPlugin`. For a Turbopack setup without message extraction that
// alias is all the plugin does, and the plugin eagerly loads @swc/core (for its
// experimental extractor), whose native addon fails on some machines.
const nextConfig = {
  turbopack: {
    resolveAlias: {
      "next-intl/config": "./i18n/request.js",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
