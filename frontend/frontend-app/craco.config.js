module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Find the PostCSS loader and ensure it's configured correctly
      const cssRule = webpackConfig.module.rules.find(
        (rule) => Array.isArray(rule.oneOf) && rule.oneOf.some((oneOfRule) => oneOfRule.test && oneOfRule.test.toString().includes('.css'))
      );

      if (cssRule) {
        cssRule.oneOf.forEach((rule) => {
          if (rule.use && Array.isArray(rule.use)) {
            const postcssLoader = rule.use.find((loader) => loader.loader && loader.loader.includes('postcss-loader'));
            if (postcssLoader) {
              postcssLoader.options.postcssOptions = {
                plugins: [
                  require('tailwindcss'), // Changed back to 'tailwindcss'
                  require('autoprefixer'),
                ],
              };
            }
          }
        });
      }

      return webpackConfig;
    },
  },
};