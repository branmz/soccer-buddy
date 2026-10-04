const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Bundle drizzle-kit's generated .sql migration files.
config.resolver.sourceExts.push('sql');

module.exports = withNativewind(config);
