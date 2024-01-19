let mix = require('laravel-mix');
const webpack = require('webpack')


mix.setPublicPath('./')
    .css('assets/css/sidepanel.css', 'dist/css')
    .copy('assets/images', 'dist/images')
    .js('assets/js/background.js', 'dist/js')
    .js('assets/js/utils.js', 'dist/js')
    .js('assets/js/sidepanel.js', 'dist/js').vue()
    .options({
        processCssUrls: false
    });

    
mix.webpackConfig ({
    plugins: [
    new webpack.DefinePlugin({
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
    }),
    ],
})