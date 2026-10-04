module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Inline drizzle-kit's .sql migration files as strings.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
