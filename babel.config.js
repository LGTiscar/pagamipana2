module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Remove react-native-dotenv plugin configuration
      // ["module:react-native-dotenv", { ... }]
    ]
  };
};
